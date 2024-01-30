import { ComponentBase } from '../componentbase/ComponentBase';

const classes = {
    root: 'p-inputgroup-addon'
};

export const InputGroupAddonBase = ComponentBase.extend({
    defaultProps: {
        __TYPE: 'InputGroupAddon',
        children: undefined
    },

    css: {
        classes
    }
});
