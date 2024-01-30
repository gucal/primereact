import { ComponentBase } from '../componentbase/ComponentBase';

const classes = {
    root: 'p-inputgroup'
};

const styles = `
@layer primereact {
    .p-inputgroup {
        display: flex;
        align-items: stretch;
        width: 100%;
    }

    .p-inputgroup-addon {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .p-inputgroup .p-float-label {
        display: flex;
        align-items: stretch;
        width: 100%;
    }

    .p-inputgroup .p-inputtext,
    .p-fluid .p-inputgroup .p-inputtext,
    .p-inputgroup .p-inputwrapper,
    .p-fluid .p-inputgroup .p-input {
        flex: 1 1 auto;
        width: 1%;
    }
}
`;

export const InputGroupBase = ComponentBase.extend({
    defaultProps: {
        __TYPE: 'InputGroup',
        children: undefined,
        className: null
    },

    css: {
        classes,
        styles
    }
});
