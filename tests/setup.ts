import { vi } from 'vitest';

// SillyTavern provides toastr as a global; the plugin never bundles its own.
vi.stubGlobal('toastr', {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
});
