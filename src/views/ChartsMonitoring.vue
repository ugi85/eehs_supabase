<script setup>
import { onMounted } from 'vue'
import MonthlyCalibration from '@/components/charts/MonthlyCalibration.vue'

onMounted(() => {
  const script = document.createElement('script')
  script.src = '../js/pages/dashboard3.js'
  script.async = true
  document.body.appendChild(script)
})
</script>

<template>
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Dashboard v3</h1>
          </div><!-- /.col -->
          <div class="col-sm-6">
            <ol class="breadcrumb float-sm-right">
              <li class="breadcrumb-item"><a href="#">Home</a></li>
              <li class="breadcrumb-item active">Dashboard v3</li>
            </ol>
          </div><!-- /.col -->
        </div><!-- /.row -->
      </div><!-- /.container-fluid -->
    </div>
    <!-- /.content-header -->

    <!-- Main content -->
    <div class="content">
      <div class="container-fluid">
        <div class="row">
          <div class="col-12 px-0"> <!-- ✅ Full width + hapus padding horizontal -->
        <div class="card">
          <div class="card-header border-0">
            <div class="d-flex justify-content-between">
              <h3 class="card-title">Monitoring Monthly</h3>
              <a href="javascript:void(0);">View Report</a>
            </div>
          </div>
          <div class="card-body" style="min-height: 100px;"> <!-- ✅ Tinggi minimal -->
            <MonthlyCalibration />
          </div>
        </div>
      </div>
         
          <!-- /.col-md-6 -->
          
          <!-- /.col-md-6 -->
        </div>
        <!-- /.row -->
      </div>
      <!-- /.container-fluid -->
    </div>
    <!-- /.content -->
</div>
  <!-- /.content-wrapper -->

</template>