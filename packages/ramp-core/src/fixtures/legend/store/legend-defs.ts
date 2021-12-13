import { LayerType, LegendSymbology, TreeNode } from '@/geo/api';
import { LayerInstance } from '@/api/internal';

/**
 * Function definitions for legend item wrapper objects.
 */
export class LegendItem {
    _uid: string;
    _id: string;
    _name: string;
    _type: LegendTypes;
    _controls: Array<string>;
    _children: Array<LegendEntry | LegendGroup> = [];
    _parent: LegendGroup | undefined = undefined; // can only be a legend group or visibility set

    _hidden: boolean;
    _itemConfig: any;

    /**
     * Create a new legend item with defaulting for all properties given config snippet, id is required.
     */
    constructor(legendItem: any) {
        this._id = legendItem.layerId;
        this._name = legendItem.name !== undefined ? legendItem.name : '';
        this._type =
            legendItem.type !== undefined ? legendItem.type : LegendTypes.Entry;
        this._controls =
            legendItem.controls !== undefined
                ? legendItem.controls
                : [
                      Controls.Visibility,
                      Controls.BoundaryZoom,
                      Controls.Metadata,
                      Controls.Refresh,
                      Controls.Reload,
                      Controls.Remove,
                      Controls.Datatable,
                      Controls.Settings,
                      Controls.Symbology
                  ];
        this._hidden =
            legendItem.hidden !== undefined ? legendItem.hidden : false;
        this._itemConfig = legendItem;

        this._uid = RAMP.GEO.sharedUtils.generateUUID();
    }

    /** Returns the item's id. */
    get id(): string {
        return this._id;
    }

    /** Returns the item's uid. */
    get uid(): string {
        return this._uid;
    }

    /** Returns the item's name. */
    get name(): string {
        return this._name;
    }

    /** Returns the item's type. */
    get type(): string {
        return this._type;
    }

    /** Returns if item is hidden. */
    get hidden(): boolean {
        return this._hidden;
    }

    /** Returns item's parent - not yet initialized. */
    get parent(): LegendItem | undefined {
        return this._parent;
    }

    /** Returns children of the legend entry, which is an empty array for single entries and and an array of legend groups (nested) or single legend entries for groups. */
    get children(): Array<LegendGroup | LegendEntry> {
        return this._children;
    }

    /** Sets children of the legend entry */
    set children(children: Array<LegendGroup | LegendEntry>) {
        this._children = children;
    }

    /**
     * Removes element from legend and removes layer if it's the last reference to it.
     */
    remove(): void {
        if (
            this._controls.includes(Controls.Remove) ||
            this.type === LegendTypes.Info
        ) {
            // TODO: implementation - involves removing from legend store property
        }
    }

    /**
     * Reloads element in legend.
     */
    reload(): void {
        if (this._controls.includes(Controls.Reload)) {
            // TODO: implementation - related to https://github.com/ramp4-pcar4/ramp4-pcar4/issues/126
        }
    }

    /**
     * Check if a control is available for the legend item.
     * @param control name of the control
     * @return {boolean} - true if the control is included in legend item's available controls
     */
    _controlAvailable(control: Controls): boolean {
        return this._controls.includes(control);
    }
}

/**
 * `LegendEntry` can either be a single legend entry or an info section (no link to layer).
 */
export class LegendEntry extends LegendItem {
    _layer: LayerInstance | undefined;
    _layerParentId: string | undefined;
    _layerUID: string | undefined;
    _layerIndex: number | undefined;
    _layerTree: TreeNode | undefined;
    _isLoaded: boolean;
    _symbologyStack: any;
    _isDefault: boolean | undefined;
    _displaySymbology: boolean;
    _loadPromise: Promise<void>;

    /**
     * Creates a new single legend entry.
     * @param legendEntry legend entry config snippet
     */
    constructor(legendEntry: any, parent: LegendGroup | undefined = undefined) {
        super(legendEntry);

        this._layerParentId = legendEntry.layerParentId;

        this._isLoaded = false;
        this._displaySymbology = legendEntry.symbologyExpanded || false;

        this._loadPromise = new Promise((resolve, _) => {
            this._type =
                legendEntry.type !== undefined
                    ? legendEntry.type
                    : LegendTypes.Entry;
            this._parent = parent;
            this._isDefault = legendEntry.isDefault;

            // find matching BaseLayer in layer store to the layerId in config
            this._layerIndex = legendEntry.entryIndex;
            this._layer = legendEntry.layers.find(
                (layer: LayerInstance) => layer.id === this._id
            );

            this._isLoaded =
                this._layer !== undefined ? this._layer.isValidState : true;

            // check if a layer has been bound to this entry and is done loading. If not, set the type to "placeholder".
            if (this._layer === undefined || !this._isLoaded) {
                this._type = LegendTypes.Placeholder;
            }

            // initialize more layer properties after layer loads
            this._waitLayerLoad().then(resolve);
        });
    }

    /**
     * Waits for layer to load before fetching layer properties - uid, tree structure, and more as needed.
     */
    async _waitLayerLoad(): Promise<void> {
        // wait for layer to finish loading
        await this._layer?.isLayerLoaded();

        // obtain uid and layer tree structure
        this._layerTree = this._layer?.getLayerTree();
        this._layerUID = this._layer?.uid;
    }

    /**
     * Ensures visibility rules are followed if legend entry nested in legend group/set on initialization.
     */
    checkVisibilityRules(): void {
        if (!this.visibility || !this._layer) {
            return;
        }
        // if parent is turned off turn layer entry visiblity off
        if (this._parent !== undefined && !this._parent.visibility) {
            this._layer.visibility = false;
        } else if (this._parent?.type === LegendTypes.Set) {
            // toggle off visibility if entry is part of a visibility set with a set entry already toggled on
            const childVisible = this._parent.children.some(
                entry => entry.visibility && entry !== this
            );

            if (childVisible) {
                this._layer.visibility = false;
            }
        }
    }

    /** Returns the load promise for this legend entry */
    get loadPromise(): Promise<void> {
        return this._loadPromise;
    }

    /** Returns the UID of the layer */
    get layerUID(): string | undefined {
        return this._layerUID || this._layer?.uid;
    }

    /** Returns the parent layer id for this layer. Only defined for sublayers */
    get layerParentId(): string | undefined {
        return this._layerParentId;
    }

    /** Returns the entry index of the layer */
    get entryIndex(): number | undefined {
        return this._layerIndex;
    }

    /** Returns visibility of layer. */
    get visibility(): boolean | undefined {
        return this._layer?.visibility;
    }

    /** Returns BaseLayer associated with legend entry. */
    get layer(): LayerInstance | undefined {
        return this._layer;
    }

    /** Returns layer tree associated with legend entry. */
    get layerTree(): TreeNode | undefined {
        return this._layerTree;
    }

    /** Returns if layer is done loading. */
    get isLoaded(): boolean {
        return this._layer !== undefined ? this._layer.isValidState : true;
    }

    /** Returns true if entry is not from config. */
    get isDefault(): boolean | undefined {
        return this._isDefault;
    }

    /** Returns true if symbology stack is expanded. */
    get displaySymbology(): boolean {
        return this._displaySymbology;
    }

    /** Sets state of symbology stack. */
    set displaySymbology(display: boolean) {
        this._displaySymbology = display;
    }

    /** Toggles state of symbology stack.
     * Seperate function is required to avoid mutation errors from Vue3
     */
    toggleDisplaySymbology() {
        this._displaySymbology = !this._displaySymbology;
        return this._displaySymbology;
    }

    /**
     * Sets the visibility of the child symbology with the given uid
     *
     * @param uid UID of the child legend symbology
     * @param value The new visibility value
     */
    setChildSymbologyVisibility(uid: string, value: boolean) {
        const filteredSymbology: Array<LegendSymbology> | undefined =
            this._layer?.legend.filter(
                (item: LegendSymbology) => item.uid === uid
            );

        if (!filteredSymbology) {
            return;
        }

        if (filteredSymbology?.length === 0) {
            console.warn(
                `Could not find child symbology in layer ${this._layer?.name} with uid: ${uid}`
            );
            return;
        }

        filteredSymbology[0].visibility = value;
        filteredSymbology[0].lastVisbility = value;
    }

    /**
     * Sets visibility of the Legend Entry - needs to verify parent visibility is updated.
     * @param visibility - true if visible, false if invisible, undefined means toggle visibility
     */
    toggleVisibility(
        visibility: boolean | undefined = undefined,
        updateParent: boolean = true
    ): void {
        if (this._controls.includes(Controls.Visibility)) {
            // do nothing if visibility of entry is already equal to the argument value
            if (this.visibility === visibility || !this.layer) {
                return;
            }
            visibility !== undefined
                ? (this._layer!.visibility = visibility)
                : (this._layer!.visibility = !this.visibility);

            // Check if some of the child symbols have their definition visibility on
            const noDefinitionsVisible: boolean = !this._layer?.legend.some(
                (item: LegendSymbology) => item.lastVisbility
            );

            if (noDefinitionsVisible) {
                // If there are no definitions visible and we toggled the parent layer on
                // then we set all the children to visible
                this._layer?.legend.forEach((item: LegendSymbology) => {
                    item.lastVisbility = true;
                });
            }

            this._layer?.legend.forEach((item: LegendSymbology) => {
                item.visibility = this.visibility ? item.lastVisbility : false;
            });

            // update parent visibility if current legend entry is part of a group or set
            if (this._parent instanceof LegendGroup && updateParent) {
                this._parent.checkVisibility(this);
            }
        }

        this._uid = RAMP.GEO.sharedUtils.generateUUID();
    }

    /**
     * Set the layer's opacity
     * Value must be within [0, 1]
     *
     * @param opacity the new layer opacity
     */
    setOpacity(opacity: number) {
        if (!this._layer) {
            return;
        }
        this._layer.opacity = opacity;
    }

    /**
     * Used by the placeholder component to set the legend entry to a loaded state
     */
    setEntry(layer: LayerInstance) {
        this._layer = layer;
        this._layer.isLayerLoaded().then(() => {
            this._layerTree = this._layer?.getLayerTree();
            this._layerUID = this._layer?.uid;
            if (
                this._layer?.layerType === LayerType.MAPIMAGE &&
                !this._layerIndex
            ) {
                this._type = LegendTypes.Placeholder;
                console.error(
                    `MapImageLayer has no entryIndex defined - ${this._itemConfig.layerId} (${this._itemConfig.name})`
                );
            } else {
                this._type = LegendTypes.Entry;
            }
        });
    }
}

/**
 * Create a legend group (which can also be visibility sets) which can contain children - providing nesting capability for Legends.
 */
export class LegendGroup extends LegendItem {
    _expanded: boolean;
    _visibility: boolean;
    _lastVisible: LegendEntry | LegendGroup | undefined;
    _visibleEntries: Array<LegendEntry | LegendGroup> = [];

    /**
     * Creates a new LegendGroup and stores all children.
     * @param legendGroup legend group config snippet
     */
    constructor(legendGroup: any, parent: LegendGroup | undefined = undefined) {
        super(legendGroup);
        this._expanded =
            legendGroup.expanded !== undefined ? legendGroup.expanded : true;
        this._visibility =
            legendGroup.visibility !== undefined
                ? legendGroup.visibility
                : true;
        this._type =
            legendGroup.exclusiveVisibility !== undefined
                ? LegendTypes.Set
                : LegendTypes.Group;
        this._parent = parent;

        // initialize group children properties
        this._initGroupProperties(legendGroup);
    }

    /**
     * Set group properties such as id, visibility and opacity. Called whenever group is created or reloaded.
     * @param legendGroup config snippet for legend group
     */
    _initGroupProperties(legendGroup: any): void {
        // initialize objects for all non-hidden group/set children entries
        const children =
            this._type === LegendTypes.Set
                ? legendGroup.exclusiveVisibility
                : legendGroup.children;
        children
            .filter((entry: any) => !entry.hidden)
            .forEach((entry: any) => {
                // create new LegendGroup/LegendEntry and push to child array
                entry.layers = legendGroup.layers;
                if (
                    entry.exclusiveVisibility !== undefined ||
                    entry.children !== undefined
                ) {
                    this._children.push(new LegendGroup(entry, this));
                } else {
                    // if the entry is a sublayer, set the entry id to the sublayers id
                    if (entry.entryIndex !== undefined) {
                        entry.layerParentId = entry.layerId;
                        entry.layerId = `${entry.layerId}-${entry.entryIndex}`;
                    }
                    this._children.push(new LegendEntry(entry, this));
                }
            });
    }

    /**
     * Ensures visibility rules are followed if legend group is nested in another group/set on initialization.
     */
    checkVisibilityRules(): void {
        if (!this._visibility) {
            return;
        }
        // if parent is turned off turn layer entry visiblity off
        if (this._parent !== undefined && !this._parent.visibility) {
            this.toggleVisibility(false, false);
        } else if (this._parent?.type === LegendTypes.Set) {
            // toggle off visibility if entry is part of a visibility set with a set entry already toggled on
            const childVisible = this._parent.children.some(
                entry => entry.visibility && entry !== this
            );

            if (childVisible) {
                this.toggleVisibility(false, false);
            }
        }
    }

    /**
     * Gets visibility of the Legend Group.
     * @return {boolean | undefined} - true if the item is currently visible, false if invisible, undefined if "visibility" is not part of controls
     */
    get visibility(): boolean | undefined {
        return this._visibility;
    }

    /**
     * Gets expanded value of the LegendGroup.
     * @return {boolean | undefined} - true if the group isexpanded, false if the group is collapsed
     */
    get expanded(): boolean | undefined {
        return this._expanded;
    }

    /**
     * Sets last visible child entry for visibility sets.
     * @param entry last visible entry in set
     */
    set lastVisible(entry: LegendEntry | LegendGroup) {
        this._lastVisible = entry;
    }

    /**
     * Save a child entry by adding it to visibleEntries.
     * @param childEntry child entry to save as last toggled on
     */
    saveEntry(childEntry: LegendEntry | LegendGroup): void {
        this._visibleEntries.push(childEntry);
    }

    /**
     * Toggles/collapses legend group.
     * @param expanded true if group should be expanded, false if group should be collapsed, or undefined if group should just be toggled
     */
    toggleExpanded(expanded: boolean | undefined = undefined): void {
        expanded !== undefined
            ? (this._expanded = expanded)
            : (this._expanded = !this._expanded);
    }

    /**
     * Updates group visibility after a child entry's visibility toggles.
     */
    checkVisibility(toggledChild: LegendEntry | LegendGroup): void {
        if (this._type === LegendTypes.Group) {
            // if any children entries are toggled on group must be toggled on, else if all children entries are toggled off, group must be toggled off
            if (this._children.some(entry => entry.visibility)) {
                this._visibility = true;
                // save all entries with visibility on
                this._visibleEntries = this._children.filter(
                    entry => entry.visibility
                );
            } else if (this._children.every(entry => !entry.visibility)) {
                this._visibility = false;
                this._visibleEntries = [];
            }
        } else if (toggledChild.visibility) {
            // turn off all child entries except for the last one toggled on, mark that as the last visible entry in the set
            this.children.forEach(entry => {
                if (entry.visibility && entry.id !== toggledChild.id) {
                    entry.toggleVisibility(false, false);
                }
            });
            this._lastVisible = toggledChild;
            this._visibility = true;
        } else {
            this._lastVisible = toggledChild;
            this._visibility = false;
        }

        // case for updating nested groups
        if (this.parent instanceof LegendGroup) {
            this.parent.checkVisibility(this);
        }
    }

    /**
     * Toggles group visibility to show/hide children.
     * @param visible true if group should have visibility toggled on, false if group visibility should be toggled off, or undefined if group visibility should be toggled
     */
    toggleVisibility(
        visible: boolean | undefined = undefined,
        updateParent: boolean = true
    ): void {
        const oldVal = this._visibility;
        visible !== undefined
            ? (this._visibility = visible)
            : (this._visibility = !this._visibility);
        // check if visibility value changes
        if (oldVal === this._visibility) {
            return;
        }

        if (this._type === LegendTypes.Group) {
            // for legend groups, if group is toggled on turn on visibility for all children that are saved, and all children if none are saved
            if (this._visibility) {
                this._visibleEntries.length > 0
                    ? this._visibleEntries.forEach(entry =>
                          entry.toggleVisibility(this._visibility, false)
                      )
                    : this._children.forEach(entry =>
                          entry.toggleVisibility(this._visibility, false)
                      );
            } else {
                // otherewise turn off visibility for all children
                this._children.forEach(entry =>
                    entry.toggleVisibility(this._visibility, false)
                );
            }
        } else {
            // otherwise for visibility sets ensure that there is only one child entry visible
            if (this._visibility) {
                // toggle the last visible child on or by default the first child entry in the set
                this._lastVisible !== undefined
                    ? this._lastVisible.toggleVisibility(true)
                    : this._children[0].toggleVisibility(true);
            } else {
                // turn off visibility for all child entries and save/update the last legend entry
                this._lastVisible = this._children.find(
                    entry => entry.visibility
                );
                this._lastVisible?.toggleVisibility(false);
            }
        }

        // update parent visibility if current legend entry is part of a group or set
        if (this._parent instanceof LegendGroup && updateParent) {
            this._parent.checkVisibility(this);
        }

        this._uid = RAMP.GEO.sharedUtils.generateUUID();
    }
}

/**
 * Create a legend set which can contain children with only up to one child item toggled on at all times - providing nesting capability for Legends.
 */
export class LegendSet extends LegendGroup {}

export enum LegendTypes {
    Group = 'LegendGroup',
    Set = 'VisibilitySet',
    Entry = 'LegendEntry',
    Info = 'InfoSection',
    Placeholder = 'Placeholder'
}

export enum Controls {
    Opacity = 'opacity',
    Visibility = 'visibility',
    Boundingbox = 'boundingBox',
    BoundaryZoom = 'boundaryZoom',
    Query = 'query',
    Metadata = 'metadata',
    Refresh = 'refresh',
    Reload = 'reload',
    Remove = 'remove',
    Settings = 'settings',
    Datatable = 'datatable',
    Symbology = 'symbology'
}
