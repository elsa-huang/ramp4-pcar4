import AppbarV from './appbar.vue';
import { AppbarAPI } from './api/appbar';
import { appbar } from './store';
import type { AppbarFixtureConfig } from './store';
import { GlobalEvents, PanelInstance } from '@/api';
import messages from './lang/lang.csv?raw';

// "It's a trap!" -- Admiral Appbar

class AppbarFixture extends AppbarAPI {
    initialized() {
        console.log(`[fixture] ${this.id} initialized`);
    }

    async added() {
        console.log(`[fixture] ${this.id} added`);

        // TODO: registering a fixture store module seems like a common action almost every fixture needs; check if this can be automated somehow
        this.$vApp.$store.registerModule('appbar', appbar());

        // merge in translations since this has no panel
        Object.entries(messages).forEach(value =>
            (<any>this.$vApp.$i18n).mergeLocaleMessage(...value)
        );

        const { vNode, destroy, el } = this.mount(AppbarV, {
            app: this.$element
        });
        const innerShell =
            this.$vApp.$el.getElementsByClassName('inner-shell')[0];
        innerShell.insertBefore(
            el.childNodes[0],
            innerShell.querySelector('.panel-stack')
        );

        this._parseConfig(this.config);
        this.$vApp.$watch(
            () => this.config,
            (value: AppbarFixtureConfig | undefined) => this._parseConfig(value)
        );

        let eventHandlers: string[] = [];

        // Add and remove temp appbar buttons when panels are opened and close
        eventHandlers.push(
            this.$iApi.event.on(
                GlobalEvents.PANEL_OPENED,
                (panel: PanelInstance) => {
                    this.$vApp.$store.dispatch(
                        'appbar/addTempButton',
                        panel.id
                    );
                }
            )
        );

        eventHandlers.push(
            this.$iApi.event.on(
                GlobalEvents.PANEL_CLOSED,
                (panel: PanelInstance) => {
                    this.$vApp.$store.dispatch(
                        'appbar/removeTempButton',
                        panel.id
                    );
                }
            )
        );

        // since components used in appbar can be registered after this point, listen to the global component registration event and re-validate items
        // TODO revisit. this seems to be self-contained to the appbar fixture, so ideally can stay as is and not worry about events api.
        eventHandlers.push(
            this.$iApi.event.on(
                GlobalEvents.COMPONENT,
                this._validateItems.bind(this)
            )
        );

        this.removed = () => {
            this.$vApp.$store.unregisterModule('appbar');
            eventHandlers.forEach(h => this.$iApi.event.off(h));
            destroy();
        };
    }
}

export default AppbarFixture;
