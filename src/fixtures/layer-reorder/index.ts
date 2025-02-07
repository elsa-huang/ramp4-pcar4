import { markRaw } from 'vue';
import LayerReorderScreenV from './screen.vue';
import LayerReorderAppbarButtonV from './appbar-button.vue';
import messages from './lang/lang.csv?raw';
import { LayerReorderAPI } from './api/layer-reorder';

class LayerReorderFixture extends LayerReorderAPI {
    added() {
        console.log(`[fixture] ${this.id} added`);

        this.$iApi.component(
            'layer-reorder-appbar-button',
            LayerReorderAppbarButtonV
        );

        this.$iApi.panel.register(
            {
                'layer-reorder-panel': {
                    screens: {
                        'layer-reorder-screen': markRaw(LayerReorderScreenV)
                    },
                    style: {
                        width: '350px'
                    },
                    alertName: 'layer-reorder.title'
                }
            },
            {
                i18n: { messages }
            }
        );
    }

    removed() {
        console.log(`[fixture] ${this.id} removed`);
        // TODO: remove appbar button (blocked by #882)
        this.$iApi.panel.remove('layer-reorder-panel'); 
    }
}

export default LayerReorderFixture;
