// src/plugins/permissions.js
import { usePermissions } from '@/composables/usePermissions'

/**
 * Vue Directive: v-can
 * Usage: <button v-can="'daftarAlat:create'">Tambah</button>
 */
export const permissionDirective = {
  install(app) {
    app.directive('can', {
      mounted(el, binding) {
        const { can } = usePermissions()
        const permission = binding.value
        
        if (!can(permission)) {
          // Remove element jika tidak punya permission
          if (el.parentNode) {
            el.parentNode.removeChild(el)
          }
        }
      }
    })

    // Global helper methods
    app.config.globalProperties.$can = (permission) => {
      const { can } = usePermissions()
      return can(permission)
    }

    app.config.globalProperties.$canAny = (permissions) => {
      const { canAny } = usePermissions()
      return canAny(permissions)
    }

    app.config.globalProperties.$canAll = (permissions) => {
      const { canAll } = usePermissions()
      return canAll(permissions)
    }

    app.config.globalProperties.$hasRole = (role) => {
      const { hasRole } = usePermissions()
      return hasRole(role)
    }

    app.config.globalProperties.$isAdmin = () => {
      const { isAdmin } = usePermissions()
      return isAdmin()
    }

    app.config.globalProperties.$isViewer = () => {
      const { isViewer } = usePermissions()
      return isViewer()
    }

    app.config.globalProperties.$user = () => {
      const { getUser } = usePermissions()
      return getUser()
    }
  }
}
