<template>
  <div class="wrapper">
    <Navbar />
    <Sidebar />
    <!-- <div class="content-wrapper"> -->
      <RouterView />
    <!-- </div> -->
    <Footer />
  </div>
</template>

<script setup>
import Navbar from '@/components/layouts/Navbar.vue'
import Sidebar from '@/components/layouts/Sidebar.vue'
import Footer from '@/components/layouts/Footer.vue'
</script>
