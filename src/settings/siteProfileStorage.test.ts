import { describe, expect, it, vi } from "vitest";

import type { LoadedSiteProfile } from "../formatter/protocol.js";
import { WorkerStoppedError } from "../formatter/client.js";
import {
  restoreSiteProfile,
  saveSiteProfile,
  SITE_PROFILE_STORAGE_KEY,
} from "./siteProfileStorage.js";

const loaded: LoadedSiteProfile = {
  profile: {
    schemaVersion: 1,
    name: "Wiki",
    extensions: { templateData: false },
  },
  serialized:
    '{"schemaVersion":1,"name":"Wiki","extensions":{"templateData":false}}\n',
  options: {},
};

describe("site profile storage", () => {
  it("stores the Worker's serialized profile under its own key and removes it", () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    saveSiteProfile(loaded.serialized, storage);
    expect(storage.setItem).toHaveBeenCalledExactlyOnceWith(
      SITE_PROFILE_STORAGE_KEY,
      loaded.serialized,
    );
    saveSiteProfile(null, storage);
    expect(storage.removeItem).toHaveBeenCalledWith(SITE_PROFILE_STORAGE_KEY);
  });

  it("revalidates stored JSON through the Worker without applying options", async () => {
    const load = vi.fn().mockResolvedValue(loaded);
    const storage = {
      getItem: vi.fn().mockReturnValue(loaded.serialized),
      removeItem: vi.fn(),
    };
    expect(await restoreSiteProfile(load, storage)).toBe(loaded);
    expect(load).toHaveBeenCalledExactlyOnceWith({ json: loaded.serialized });
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("silently discards invalid profiles and tolerates unavailable storage", async () => {
    const load = vi.fn().mockRejectedValue(new Error("Invalid profile"));
    const storage = {
      getItem: vi.fn().mockReturnValue("broken"),
      removeItem: vi.fn(),
    };
    expect(await restoreSiteProfile(load, storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(SITE_PROFILE_STORAGE_KEY);
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(await restoreSiteProfile(load, storage)).toBeNull();
    expect(() =>
      saveSiteProfile(loaded.serialized, {
        setItem() {
          throw new Error("full");
        },
        removeItem: vi.fn(),
      }),
    ).not.toThrow();
  });

  it("keeps a profile when Worker initialization or restart interrupts validation", async () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(loaded.serialized),
      removeItem: vi.fn(),
    };
    expect(
      await restoreSiteProfile(
        vi.fn().mockRejectedValue(new WorkerStoppedError()),
        storage,
      ),
    ).toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
