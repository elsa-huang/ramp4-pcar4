<template>
    <panel-screen>
        <template #header>
            {{ $t('metadata.title') }}: {{ payload.layerName }}
        </template>

        <template #controls>
            <minimize @click="panel.minimize()" />
            <close @click="panel.close()" />
        </template>

        <template #content>
            <div class="flex justify-center">
                <!-- Loading Screen -->
                <div
                    v-if="state.status == 'loading'"
                    class="flex flex-col justify-center text-center"
                >
                    Loading...
                </div>

                <!-- Found Screen, XML -->
                <div
                    v-else-if="
                        payload.type === 'xml' && state.status == 'success'
                    "
                    class="flex flex-col justify-center"
                ></div>

                <!-- Found Screen, HTML -->
                <div
                    v-else-if="
                        payload.type === 'html' && state.status == 'success'
                    "
                    v-html="state.response"
                    class="flex flex-col justify-center max-w-full"
                ></div>

                <!-- Error Screen -->
                <div v-else class="flex flex-col justify-center text-center">
                    <img src="https://i.imgur.com/fA5EqV6.png" />

                    <span class="text-xl mt-20"
                        >There was an error retrieving this resource. Please try
                        again.</span
                    >
                </div>
            </div>
        </template>
    </panel-screen>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { PanelInstance } from '@/api';
import type {
    MetadataPayload,
    MetadataResult,
    MetadataState,
    MetadataCache
} from './definitions';

import XSLT_en from './files/xstyle_default_en.xsl?raw';
import XSLT_fr from './files/xstyle_default_fr.xsl?raw';

export default defineComponent({
    name: 'MetadataScreenV',

    props: {
        panel: {
            type: Object as PropType<PanelInstance>
        },
        payload: {
            type: Object as PropType<MetadataPayload>,
            required: true
        }
    },

    data() {
        return {
            state: { status: 'loading', response: null } as MetadataState,
            cache: {} as MetadataCache
        };
    },

    mounted() {
        if (this.payload.type === 'xml') {
            this.loadFromURL(this.payload.url, []).then(r => {
                this.state.status = 'success';

                // Append the content to the panel.
                if (r !== null) {
                    this.$el.childNodes[1].appendChild(r);
                }
            });
        } else if (this.payload.type === 'html') {
            this.requestContent(this.payload.url).then(r => {
                this.state.status = 'success';
                this.state.response = r.response;
            });
        }
    },

    methods: {
        /**
         * Applies an XSLT to XML, XML is provided but the XSLT is stored in a string constant.
         *
         * @method loadFromURL
         * @param {String} xmlUrl Location of the xml file
         * @param {Array} params an array which never seems to be set and is never used
         * @return {Promise} a promise resolving with an HTML fragment
         */
        loadFromURL(xmlUrl: string, params: any[]) {
            let XSLT = this.$iApi.language === 'en' ? XSLT_en : XSLT_fr;

            // Translate headers.
            XSLT = XSLT.replace(/\{\{([\w.]+)\}\}/g, (_: string, tag: string) =>
                this.$t(tag)
            );

            if (!this.cache[xmlUrl]) {
                return this.requestContent(xmlUrl).then(xmlData => {
                    this.cache[xmlUrl] = xmlData.response;
                    return this.applyXSLT(this.cache[xmlUrl], XSLT, params);
                });
            } else {
                return Promise.resolve(
                    this.applyXSLT(this.cache[xmlUrl], XSLT, params)
                );
            }
        },

        /**
         * Transform XML using XSLT
         * @function applyXSLT
         * @private
         * @param {string} xmlString text data of the XML document
         * @param {string} xslString text data of the XSL document
         * in IE)}
         * @param {Array} params a list of paramters to apply to the transform
         * @return {object} transformed document
         */
        applyXSLT(xmlString: string, xslString: string, params: any[]) {
            let output = null;

            if (window.XSLTProcessor) {
                const xsltProc = new window.XSLTProcessor();
                const parser = new DOMParser();

                const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
                const xslDoc = parser.parseFromString(xslString, 'text/xml');
                xsltProc.importStylesheet(xslDoc);
                // [patched from ECDMP] Add parameters to xsl document (setParameter = Chrome/FF/Others)
                if (params) {
                    params.forEach(p =>
                        xsltProc.setParameter('', p.key, p.value || '')
                    );
                }
                output = xsltProc.transformToFragment(xmlDoc, document);
            } else if (window.hasOwnProperty('ActiveXObject')) {
                // IE11 (╯°□°）╯︵ ┻━┻
                const xslt = new window.ActiveXObject('Msxml2.XSLTemplate');
                const xmlDoc = new window.ActiveXObject('Msxml2.DOMDocument');
                const xslDoc = new window.ActiveXObject(
                    'Msxml2.FreeThreadedDOMDocument'
                );
                xmlDoc.loadXML(xmlString);
                xslDoc.loadXML(xslString);
                xslt.stylesheet = xslDoc;
                const xsltProc = xslt.createProcessor();
                xsltProc.input = xmlDoc;
                xsltProc.transform();
                output = document
                    .createRange()
                    .createContextualFragment(xsltProc.output);
            }

            return output;
        },

        /**
         * Sends a GET request to the provided URL. Returns a promise containing information received from the webpage.
         * */
        requestContent(url: string): Promise<MetadataResult> {
            return new Promise((resolve, reject) => {
                const xobj = new XMLHttpRequest();
                xobj.open('GET', url, true);
                xobj.responseType = 'text';
                xobj.onload = () => {
                    if (xobj.status === 200) {
                        resolve({ status: 'success', response: xobj.response });
                    } else {
                        resolve({
                            status: 'error',
                            response:
                                'Could not load results from remote service.'
                        });
                    }
                };
                xobj.onerror = () => {
                    resolve({
                        status: 'error',
                        response: 'Could not load results from remote service.'
                    });
                };
                xobj.send();
            });
        }
    }
});
</script>

<style lang="scss" scoped></style>
