// src/directives/can.js
import { usePermissions } from '@/composables/usePermissions'

export const canDirective = {
  beforeMount(el, binding) {
    const { can } = usePermissions()
    
    const hasPermission = can(binding.value)
    
    if (!hasPermission) {
      // Remove element dari DOM jika tidak punya permission
      if (el.parentNode) {
        el.parentNode.removeChild(el)
      }
    }
  },
  updated(el, binding) {
    const { can } = usePermissions()
    
    const hasPermission = can(binding.value)
    
    if (!hasPermission) {
      // Hide element jika tidak punya permission
      el.style.display = 'none'
    } else {
      el.style.display = ''
    }
  }
}

// Plugin untuk register directive
export function setupDirectives(app) {
  app.directive('can', canDirective)
}

export default canDirective
