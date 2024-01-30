import React from 'react';
import { PrimeReactContext } from '../api/Api';
import { useHandleStyle } from '../componentbase/componentbase';
import { mergeProps } from '../utils/MergeProps';
import { classNames } from '../utils/Utils';
import { InputGroupAddonBase } from './InputGroupAddonBase';

export const InputGroupAddon = React.memo(
    React.forwardRef((inProps, ref) => {
        const context = React.useContext(PrimeReactContext);
        const props = InputGroupAddonBase.getProps(inProps, context);
        const { ptm, cx, isUnstyled } = InputGroupAddonBase.setMetaData({
            props,
            ...props.__parentMetadata,
            context: {
                disabled: props.disabled
            }
        });

        useHandleStyle(InputGroupAddonBase.css.styles, isUnstyled, { name: 'inputgroupaddon', styled: true });

        const rootProps = mergeProps({
            className: classNames(props.className, cx('root'))
        });

        return <div {...rootProps}>{props.children}</div>;
    })
);

InputGroupAddon.displayName = 'InputGroupAddon';
