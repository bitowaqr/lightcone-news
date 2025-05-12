<template>
    <div>
        

      <svg class="orbit" viewBox="0 0 220 220" aria-hidden="true">
        <circle cx="110" cy="110" r="103" />
      </svg>

      <svg class="logo" viewBox="0 0 193 157" aria-hidden="true">
        <path d="M152 17.5V17.5002C152 17.5094 152 17.5473 151.97 17.6329C151.937 17.7261 151.861 17.8957 151.689 18.1392C151.328 18.6495 150.635 19.3561 149.423 20.1846C146.979 21.856 143.115 23.5601 137.891 25.0713C127.509 28.0743 112.873 30 96.5 30C80.1266 30 65.4913 28.0743 55.1094 25.0713C49.8849 23.5601 46.0208 21.856 43.5769 20.1846C42.3654 19.3561 41.672 18.6495 41.311 18.1392C41.1387 17.8957 41.0627 17.7261 41.03 17.6329C41 17.5474 41 17.5094 41 17.5002V17.5V17.4998C41 17.4906 41 17.4526 41.03 17.3671C41.0627 17.2739 41.1387 17.1043 41.311 16.8608C41.672 16.3505 42.3654 15.6439 43.5769 14.8154C46.0208 13.144 49.8849 11.4399 55.1094 9.92873C65.4913 6.92571 80.1266 5 96.5 5C112.873 5 127.509 6.92571 137.891 9.92873C143.115 11.4399 146.979 13.144 149.423 14.8154C150.635 15.6439 151.328 16.3505 151.689 16.8608C151.861 17.1043 151.937 17.2739 151.97 17.3671C152 17.4527 152 17.4906 152 17.4998V17.5Z"/>
        <path d="M153 139.5C153 139.502 153 139.504 153 139.508C152.999 139.512 152.999 139.517 152.997 139.524C152.995 139.537 152.989 139.565 152.973 139.609C152.942 139.697 152.867 139.864 152.691 140.108C152.323 140.619 151.615 141.33 150.376 142.163C147.88 143.843 143.938 145.552 138.619 147.065C128.048 150.073 113.155 152 96.5 152C79.8447 152 64.9519 150.073 54.3814 147.065C49.0619 145.552 45.1208 143.843 42.6239 142.163C41.3854 141.33 40.6768 140.619 40.3088 140.108C40.1335 139.864 40.058 139.697 40.0266 139.609C40.011 139.565 40.0049 139.537 40.0025 139.524C40.0002 139.51 40 139.504 40 139.5C40 139.496 40.0002 139.49 40.0025 139.476C40.0049 139.463 40.011 139.435 40.0266 139.391C40.058 139.303 40.1335 139.136 40.3088 138.892C40.6768 138.381 41.3854 137.67 42.6239 136.837C45.1208 135.157 49.0619 133.448 54.3814 131.935C64.9519 128.927 79.8447 127 96.5 127C113.155 127 128.048 128.927 138.619 131.935C143.938 133.448 147.88 135.157 150.376 136.837C151.615 137.67 152.323 138.381 152.691 138.892C152.867 139.136 152.942 139.303 152.973 139.391C152.989 139.435 152.995 139.463 152.997 139.476C153 139.49 153 139.496 153 139.5Z"/>
        <path d="M40 139L93 80"/>
        <path d="M102 80L152 19"/>
        <path d="M93 79L41 19"/>
        <path d="M153 139L102 80"/>
        <path d="M96.5 60.1651L173.063 80L96.5 99.8349L19.9371 80L96.5 60.1651Z"/>
      </svg>
    </div>

</template>

<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
    const orbitSVG = document.querySelector('.orbit') as HTMLElement | null;
    if (!orbitSVG) return;

    const circle = orbitSVG.querySelector('circle') as SVGCircleElement | null;
    if (!circle) return;

    const C = circle.getTotalLength();

    circle.style.strokeDasharray = `${0.05 * C} ${C}`;

    function tick(now) {
        const t = now / 1000;

        // rotation: 360° in 2.5 s (‑20% speed versus 2 s)
        const period = 2.5; // seconds per revolution
        const angleDeg = (t * 360) / period;
        orbitSVG.style.transform = `rotate(${angleDeg}deg)`;

        // arc length modulation synced to same period
        const lenFactor = 0.05 + 0.25 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / period));
        circle.style.strokeDasharray = `${lenFactor * C} ${C}`;

        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
});

</script>

<style scoped>
    :root {
        --canvas: #f6f6f6;
        --icon-bg: hsl(40 33% 92%);
        --stroke: #222222;
      }

      html,body {
        height: 100%;
        margin: 0;
        background: var(--canvas);
        display: grid;
        place-items: center;
        font-family: system-ui, sans-serif;
      }

      .loader {
        width: 220px;
        height: 220px;
        border-radius: 50%;
        background: var(--icon-bg);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo {
        width: 75%;
        height: 75%;
        z-index: 2;
      }
      .logo path {
        fill: none;
        stroke: var(--stroke);
        stroke-width: 10;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .orbit {
        position: absolute;
        inset: 0;
      }
      .orbit circle {
        fill: none;
        stroke: var(--stroke);
        stroke-width: 6;
        stroke-linecap: round;
      }

      @media (prefers-reduced-motion: reduce) {
        .orbit, .orbit circle { display: none; }
      }
</style>