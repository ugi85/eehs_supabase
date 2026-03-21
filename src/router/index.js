import { createRouter, createWebHistory } from 'vue-router'
import { userStore } from '@/stores/userStore'

//layouts
import MainLayout from '@/layouts/MainLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

//views
import Dashboard from '@/views/DashboardChart.vue'
import Login from '@/views/pages/examples/login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:'/',
      component: MainLayout,
      children: [
        {
          path: '/',
          name: 'dashboard',
          component: Dashboard,
        },
    {
      path: '/dashboardV2',
      name: 'dashboardV2',
      component: () => import('@/views/DashboardV2.vue'),
    },
    {
      path: '/dashboardV3',
      name: 'dashboardV3',
      component: () => import('@/views/DashboardV3.vue'),
    },
    {
      path: '/dashChart',
      name: 'dashboardChart',
      component: () => import('@/views/DashboardChart.vue'),
    },
     {
      path: '/daftarAlat',
      name: 'daftarAlat',
      component: () => import('@/views/daftarAlat/list.vue'),
    },
       {
      path: '/jadwalKalibrasi',
      name: 'jadwalKalibrasi',
      component: () => import('@/views/jadwalKalibrasi/list.vue'),
    },
       {
      path: '/logCal',
      name: 'logCal',
      component: () => import('@/views/logAktifitas/kalibrasi.vue'),
    },
     {
      path: '/logPm',
      name: 'logPm',
      component: () => import('@/views/logAktifitas/pm.vue'),
    },
    {
      path: '/allAktivitas',
      name: 'allAktivitas',
      component: () => import('@/views/logAktifitas/allAktivitas.vue'),
    },
     {
      path: '/configurasi',
      name: 'configurasi',
      component: () => import('@/views/settings/config.vue'),
    },
     {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/roles/list.vue'),
      meta: { requiresAuth: true, requiresSuperadmin: true }
    },
     {
      path: '/user',
      name: 'user',
      component: () => import('@/views/users/list.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
     {
      path: '/chartMonitoring',
      name: 'chartMonitoring',
      component: () => import('@/views/ChartsMonitoring.vue'),
    },

    {
      path: '/widgets',
      name: 'widgets',
      component: () => import('@/views/pages/widgets.vue'),
    },
     {
      path: '/top-nav',
      name: 'top-nav',
      component: () => import('@/views/pages/layout/top-nav.vue'),
    },
     {
      path: '/top-nav-sidebar',
      name: 'top-nav-sidebar',
      component: () => import('@/views/pages/layout/top-nav-sidebar.vue'),
    },
     {
      path: '/boxed',
      name: 'boxed',
      component: () => import('@/views/pages/layout/boxed.vue'),
    },
    {
      path: '/charts',
      name: 'charts',
      component: () => import('@/views/pages/charts/chartjs.vue'),
    },
    {
      path: '/charts/flot',
      name: 'charts-flot',
      component: () => import('@/views/pages/charts/flot.vue'),
    },
    {
      path: '/charts/inline',
      name: 'charts-inline',
      component: () => import('@/views/pages/charts/inline.vue'),
    },
    {
      path: '/charts/uplot',
      name: 'charts-uplot',
      component: () => import('@/views/pages/charts/uplot.vue'),
    },
    {
      path: '/ui/general',
      name: 'ui-general',
      component: () => import('@/views/pages/ui/general.vue'),
    },
    {
      path: '/ui/icons',
      name: 'ui-icons',
      component: () => import('@/views/pages/ui/icons.vue'),
    },
    {
      path: '/ui/buttons',
      name: 'ui-buttons',
      component: () => import('@/views/pages/ui/buttons.vue'),
    },
    {
      path: '/ui/sliders',
      name: 'ui-sliders',
      component: () => import('@/views/pages/ui/sliders.vue'),
    },
    {
      path: '/ui/modals',
      name: 'ui-modals',
      component: () => import('@/views/pages/ui/modal.vue'),
    },
    {
      path: '/ui/navbar',
      name: 'ui-navbar',
      component: () => import('@/views/pages/ui/navbar.vue'),
    },
    {
      path: '/ui/timeline',
      name: 'ui-timeline',
      component: () => import('@/views/pages/ui/timeline.vue'),
    },
    {
      path: '/ui/ribbons',
      name: 'ui-ribbons',
      component: () => import('@/views/pages/ui/ribbons.vue'),
    },
    {
      path: '/forms/general',
      name: 'forms-general',
      component: () => import('@/views/pages/forms/general.vue'),
    },
     {
      path: '/forms/advanced',
      name: 'forms-advanced',
      component: () => import('@/views/pages/forms/advanced.vue'),
    },
    {
      path: '/forms/editors',
      name: 'forms-editors',
      component: () => import('@/views/pages/forms/editors.vue'),
    },
    {
      path: '/forms/validation',
      name: 'forms-validation',
      component: () => import('@/views/pages/forms/validation.vue'),
    },
    {
      path: '/tables/simple',
      name: 'tables-simple',
      component: () => import('@/views/pages/tables/simple.vue'),
    },
    {
      path: '/tables/data',
      name: 'tables-data',
      component: () => import('@/views/pages/tables/data.vue'),
    },
    {
      path: '/tables/jsgrid',
      name: 'tables-jsgrid',
      component: () => import('@/views/pages/tables/jsgrid.vue'),
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/views/pages/calendar.vue'),
    },
     {
      path: '/gallery',
      name: 'gallery',
      component: () => import('@/views/pages/gallery.vue'),
    },
    {
      path: '/kanban',
      name: 'kanban',
      component: () => import('@/views/pages/kanban.vue'),
    },
    {
      path: '/mailbox/inbox',
      name: 'mailbox-inbox',
      component: () => import('@/views/pages/mailbox/mailbox.vue'),
    },
    {
      path: '/mailbox/compose',
      name: 'mailbox-compose',
      component: () => import('@/views/pages/mailbox/compose.vue'),
    },
    {
      path: '/mailbox/read-mail',
      name: 'mailbox-read-mail',
      component: () => import('@/views/pages/mailbox/read-mail.vue'),
    },
     {
      path: '/examples/invoice',
      name: 'examples-invoice',
      component: () => import('@/views/pages/examples/invoice.vue'),
    },
     {
      path: '/examples/profile',
      name: 'examples-profile',
      component: () => import('@/views/pages/examples/profile.vue'),
    },
    {
      path: '/examples/e-commerce',
      name: 'examples-e-commerce',
      component: () => import('@/views/pages/examples/e-commerce.vue'),
    },
    {
      path: '/examples/projects',
      name: 'examples-projects',
      component: () => import('@/views/pages/examples/projects.vue'),
    },
    {
      path: '/examples/project-add',
      name: 'examples-project-add',
      component: () => import('@/views/pages/examples/project-add.vue'),
    },
    {
      path: '/examples/project-edit',
      name: 'examples-project-edit',
      component: () => import('@/views/pages/examples/project-edit.vue'),
    },
    {
      path: '/examples/project-detail',
      name: 'examples-project-detail',
      component: () => import('@/views/pages/examples/project-detail.vue'),
    },
    {
      path: '/examples/contacts',
      name: 'examples-contacts',
      component: () => import('@/views/pages/examples/contacts.vue'),
    },
    {
      path: '/examples/faq',
      name: 'examples-faq',
      component: () => import('@/views/pages/examples/faq.vue'),
    },
     {
      path: '/examples/contact-us',
      name: 'examples-contact-us',
      component: () => import('@/views/pages/examples/contact-us.vue'),
    },
    {
        path: '/examples/legacy-user-menu',
        name: 'legacy-user-menu',
        component: () => import('@/views/pages/examples/legacy-user-menu.vue'),
      },
      {
        path: '/examples/language-menu',
        name: 'language-menu',
        component: () => import('@/views/pages/examples/language-menu.vue'),
      },
      {
        path: '/examples/404',
        name: '404',
        component: () => import('@/views/pages/examples/404.vue'),
      },
        {
        path: '/examples/500',
        name: '500',
        component: () => import('@/views/pages/examples/500.vue'),
      },
        {
        path: '/examples/pace',
        name: 'pace',
        component: () => import('@/views/pages/examples/pace.vue'),
      },
        {
        path: '/examples/blank',
        name: 'blank',
        component: () => import('@/views/pages/examples/blank.vue'),
      },
        {
        path: '/examples/starter',
        name: 'starter',
        component: () => import('@/views/pages/examples/starter.vue'),
      },
       {
        path: '/search/simple',
        name: 'simple',
        component: () => import('@/views/pages/search/simple.vue'),
      },
      {
        path: '/search/enhanced',
        name: 'enhanced',
        component: () => import('@/views/pages/search/enhanced.vue'),
      },
      {
        path: '/examples/iframe',
        name: 'iframe',
        component: () => import('@/views/pages/examples/iframe.vue'),
      },
      ]
     },

  // Auth routes

       {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '/examples/login',
        name: 'login',
        component: Login
      },
      {
        path: '/examples/register',
        name: 'register',
        component: () => import('@/views/pages/examples/register.vue')
      },
      {
        path: '/examples/forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/pages/examples/forgot-password.vue')
      },
      {
        path: '/examples/recover-password',
        name: 'recover-password',
        component: () => import('@/views/pages/examples/recover-password.vue')
      },
      {
        path: '/examples/forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/pages/examples/forgot-password.vue')
      },
      {
        path: '/examples/login-v2',
        name: 'login-v2',
        component: () => import('@/views/pages/examples/login-v2.vue')
      },
      {
        path: '/examples/register-v2',
        name: 'register-v2',
        component: () => import('@/views/pages/examples/register-v2.vue')
      },
      {
        path: '/examples/forgot-password-v2',
        name: 'forgot-password-v2',
        component: () => import('@/views/pages/examples/forgot-password-v2.vue')
      },
      {
        path: '/examples/recover-password-v2',
        name: 'recover-password-v2',
        component: () => import('@/views/pages/examples/recover-password-v2.vue')
      },
      {
        path: '/examples/lockscreen',
        name: 'lockscreen',
        component: () => import('@/views/pages/examples/lockscreen.vue')
      },
    ]
  },
  ],
})

// Navigation Guard untuk proteksi route
router.beforeEach((to, from, next) => {
  const isLoggedIn = !!userStore.state.user
  const permissions = userStore.state.permissions || []

  // Cek jika route membutuhkan permission spesifik
  if (isLoggedIn && to.meta.requiresPermission) {
    const hasPermission = permissions.includes(to.meta.requiresPermission)
    if (!hasPermission) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Anda tidak memiliki izin untuk mengakses halaman ini'
      })
      next('/dashChart') // Redirect ke dashboard
      return
    }
  }

  // Cek jika route membutuhkan role admin (fallback jika tidak ada custom permissions)
  if (to.meta.requiresAdmin && isLoggedIn) {
    // Jika ada custom permissions, cek permission 'user:view'
    if (permissions.length > 0) {
      if (!permissions.includes('user:view')) {
        Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: 'Anda tidak memiliki izin untuk mengakses halaman ini'
        })
        next('/dashChart')
        return
      }
    } else if (userStore.state.user?.role !== 'admin') {
      // Fallback ke role-based check
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Anda tidak memiliki izin untuk mengakses halaman ini'
      })
      next('/dashChart')
      return
    }
  }

  // Cek jika route membutuhkan superadmin
  if (to.meta.requiresSuperadmin && isLoggedIn) {
    const user = userStore.state.user
    // Check role = 'superadmin' OR email starts with 'super@'
    const isSuperadmin = user && (
      (user.role && user.role.toLowerCase() === 'superadmin') ||
      (user.email && user.email.toLowerCase().startsWith('super@'))
    )
    
    if (!isSuperadmin) {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak',
        text: 'Halaman ini hanya dapat diakses oleh Super Admin'
      })
      next('/dashChart')
      return
    }
  }

  next()
})

export default router
