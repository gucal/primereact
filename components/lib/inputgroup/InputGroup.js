import React from 'react';
import { PrimeReactContext } from '../api/Api';
import { useHandleStyle } from '../componentbase/componentbase';
import { mergeProps } from '../utils/MergeProps';
import { classNames } from '../utils/Utils';
import { InputGroupBase } from './InputGroupBase';

export const InputGroup = React.memo(
    React.forwardRef((inProps, ref) => {
        const context = React.useContext(PrimeReactContext);
        const props = InputGroupBase.getProps(inProps, context);

        const { ptm, cx, isUnstyled } = InputGroupBase.setMetaData({
            props,
            ...props.__parentMetadata,
            context: {
                disabled: props.disabled
            }
        });

        useHandleStyle(InputGroupBase.css.styles, isUnstyled, { name: 'inputgroup', styled: true });

        const rootProps = mergeProps({
            className: classNames(props.className, cx('root'))
        });

        return <div {...rootProps}>{props.children}</div>;
    })
);

InputGroup.displayName = 'InputGroup';
