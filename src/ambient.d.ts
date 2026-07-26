export {}

import 'moment'

// FIXME: stub type decls
declare global {
  const process: any
  const __set_theme__: any
  const __service_worker_url_base: string

  interface Window {
    programs: any
    serviceWorkerReg: any
    purgeOfflineData: any
  }

  interface ImportMeta {
    env: Record<`COSCUP_${string}`, string>
  }
}
