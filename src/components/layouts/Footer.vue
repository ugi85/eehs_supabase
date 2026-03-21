  <template>
  <!-- Main Footer -->
  <footer class="main-footer">
    <strong>Copyright &copy; 2026_Sugiyono</strong>
    <div class="float-right d-none d-sm-inline-block">
      <b>Version</b> {{ systemVersion }}
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue'
import { useFrontendConfig } from '@/composables/useConfig'

const { config } = useFrontendConfig()

const systemVersion = computed(() => config.value.systemVersion || '1.0')
</script>