<template>
    <appbar-button
        :onClickFunction="onClick"
        :tooltip="$t('details.layers.title')"
    >
        <!-- https://fonts.google.com/icons?selected=Material+Icons:place -->
        <svg
            class="fill-current w-24 h-24 ml-8 sm:ml-20"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
        >
            <path d="M0 0h24v24H0z" fill="none" />
            <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            />
        </svg>
    </appbar-button>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'DetailsLayersAppbarButtonV',
    methods: {
        onClick() {
            this.$iApi.panel.toggleMinimize('details-layers-panel');
        }
    }
});
</script>

<style lang="scss" scoped></style>
