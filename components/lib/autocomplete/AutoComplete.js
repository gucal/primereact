import * as React from 'react';
import PrimeReact, { PrimeReactContext, localeOption } from '../api/Api';
import { Button } from '../button/Button';
import { useHandleStyle } from '../componentbase/ComponentBase';
import { useMergeProps, useMountEffect, useOverlayListener, useUnmountEffect, useUpdateEffect } from '../hooks/Hooks';
import { ChevronDownIcon } from '../icons/chevrondown';
import { SpinnerIcon } from '../icons/spinner';
import { TimesCircleIcon } from '../icons/timescircle';
import { InputText } from '../inputtext/InputText';
import { OverlayService } from '../overlayservice/OverlayService';
import { Tooltip } from '../tooltip/Tooltip';
import { DomHandler, IconUtils, ObjectUtils, UniqueComponentId, ZIndexUtils, classNames } from '../utils/Utils';
import { AutoCompleteBase } from './AutoCompleteBase';
import { AutoCompletePanel } from './AutoCompletePanel';

export const AutoComplete = React.memo(
    React.forwardRef((inProps, ref) => {
        const mergeProps = useMergeProps();
        const context = React.useContext(PrimeReactContext);
        const props = AutoCompleteBase.getProps(inProps, context);
        const [idState, setIdState] = React.useState(props.id);
        const [clicked, setClicked] = React.useState(false);
        const [focusedOptionIndex, setFocusedOptionIndex] = React.useState(-1);
        const [focusedMultipleOptionIndex, setFocusedMultipleOptionIndex] = React.useState(-1);
        const [searchingState, setSearchingState] = React.useState(false);
        const [focusedState, setFocusedState] = React.useState(false);
        const [dirtyState, setDirtyState] = React.useState(false);
        const [overlayVisibleState, setOverlayVisibleState] = React.useState(false);
        const dropdownButtonRef = React.useRef(null);
        const listRef = React.useRef(null);
        const searchTimeout = React.useRef(null);

        const metaData = {
            props,
            state: {
                id: idState,
                searching: searchingState,
                focused: focusedState,
                clicked: clicked,
                overlayVisible: overlayVisibleState
            }
        };

        const { ptm, cx, sx, isUnstyled } = AutoCompleteBase.setMetaData(metaData);

        useHandleStyle(AutoCompleteBase.css.styles, isUnstyled, { name: 'autocomplete' });
        const elementRef = React.useRef(null);
        const overlayRef = React.useRef(null);
        const inputRef = React.useRef(props.inputRef);
        const multiContainerRef = React.useRef(null);
        const virtualScrollerRef = React.useRef(null);
        const timeout = React.useRef(null);
        const selectedItem = React.useRef(null);
        const [bindOverlayListener, unbindOverlayListener] = useOverlayListener({
            target: elementRef,
            overlay: overlayRef,
            listener: (event, { type, valid }) => {
                if (valid) {
                    type === 'outside' ? !isInputClicked(event) && hide() : hide();
                }
            },
            when: overlayVisibleState
        });

        const isDropdownClicked = (event) => {
            return dropdownButtonRef.current ? event.target === dropdownButtonRef.current || dropdownButtonRef.current.contains(event.target) : false;
        };

        const isInputClicked = (event) => {
            return props.multiple ? event.target === multiContainerRef.current || multiContainerRef.current.contains(event.target) : event.target === inputRef.current;
        };

        const getOptionValue = (option) => {
            return option; // TODO: The 'optionValue' properties can be added.
        };

        const onOptionSelect = (event, option, isHide = true) => {
            const value = getOptionValue(option);

            if (props.multiple) {
                inputRef.current.value = '';

                if (!isSelected(option)) {
                    updateModel(event, [...(props.value || []), value]);
                }
            } else {
                updateModel(event, value);
            }

            isHide && hide(true);
        };

        const onChange = (event) => {
            if (props.forceSelection) {
                let valid = false;

                // when forceSelection is on, prevent called twice onOptionSelect()
                if (visibleOptions() && !props.multiple) {
                    const matchedValue = visibleOptions().find((option) => isOptionMatched(option, inputRef.current.value || ''));

                    if (matchedValue !== undefined) {
                        valid = true;
                        !isSelected(matchedValue) && onOptionSelect(event, matchedValue);
                    }
                }

                if (!valid) {
                    inputRef.current.value = '';
                    props.onClear && props.onClear(event);

                    !props.multiple && updateModel(event, null);
                }
            }
        };

        const search = (event, query, source) => {
            //allow empty string but not undefined or null
            if (query === undefined || query === null) {
                return;
            }

            //do not search blank values on input change
            if (source === 'input' && query.trim().length === 0) {
                return;
            }

            setSearchingState(true);

            if (props.completeMethod) {
                setSearchingState(true);
                props.completeMethod({
                    originalEvent: event,
                    query
                });
            }
        };

        const selectItem = (event, option, preventInputFocus) => {
            if (props.multiple) {
                inputRef.current.value = '';

                // allows empty value/selectionlimit and within sectionlimit
                if (!isSelected(option) && isAllowMoreValues()) {
                    const newValue = props.value ? [...props.value, option] : [option];

                    updateModel(event, newValue);
                }
            } else {
                updateInputField(option);
                updateModel(event, option);
            }

            if (props.onSelect) {
                props.onSelect({
                    originalEvent: event,
                    value: option
                });
            }

            if (!preventInputFocus) {
                DomHandler.focus(inputRef.current);
                hide();
            }
        };

        const updateModel = (event, value) => {
            // #2176 only call change if value actually changed
            if (selectedItem.current && ObjectUtils.deepEquals(selectedItem.current, value)) {
                return;
            }

            if (props.onChange) {
                props.onChange({
                    originalEvent: event,
                    value,
                    stopPropagation: () => {
                        event.stopPropagation();
                    },
                    preventDefault: () => {
                        event.preventDefault();
                    },
                    target: {
                        name: props.name,
                        id: idState,
                        value
                    }
                });
            }

            selectedItem.current = ObjectUtils.isNotEmpty(value) ? value : null;
        };

        const formatValue = (value) => {
            if (ObjectUtils.isNotEmpty(value)) {
                if (typeof value === 'string') {
                    return value;
                } else if (props.selectedItemTemplate) {
                    const resolvedFieldData = ObjectUtils.getJSXElement(props.selectedItemTemplate, value);

                    return resolvedFieldData ? resolvedFieldData : value;
                } else if (props.field) {
                    const resolvedFieldData = ObjectUtils.resolveFieldData(value, props.field);

                    return resolvedFieldData !== null && resolvedFieldData !== undefined ? resolvedFieldData : value;
                } else {
                    return value;
                }
            }

            return '';
        };

        const updateInputField = (value) => {
            inputRef.current.value = formatValue(value);
        };

        const show = () => {
            setOverlayVisibleState(true);
        };

        const hide = (isFocus) => {
            const _hide = () => {
                setDirtyState(isFocus);
                setOverlayVisibleState(false);
                setClicked(false);
                setFocusedOptionIndex(-1);

                isFocus && DomHandler.focus(inputRef.current);
            };

            setTimeout(() => {
                _hide();
            }, 0); // For ScreenReaders
        };

        const onOverlayEnter = () => {
            ZIndexUtils.set('overlay', overlayRef.current, (context && context.autoZIndex) || PrimeReact.autoZIndex, (context && context.zIndex['overlay']) || PrimeReact.zIndex['overlay']);
            DomHandler.addStyles(overlayRef.current, { position: 'absolute', top: '0', left: '0' });
            alignOverlay();
        };

        const onOverlayEntering = () => {
            if (props.autoHighlight && props.suggestions && props.suggestions.length) {
                const element = getScrollableElement().firstChild.firstChild;

                if (element) {
                    !isUnstyled() && DomHandler.addClass(element, 'p-highlight');
                    element.setAttribute('data-p-highlight', true);
                }
            }
        };

        const onOverlayEntered = () => {
            bindOverlayListener();
            props.onShow && props.onShow();
        };

        const onOverlayExit = () => {
            unbindOverlayListener();
        };

        const onOverlayExited = () => {
            ZIndexUtils.clear(overlayRef.current);

            props.onHide && props.onHide();
        };

        const alignOverlay = () => {
            const target = props.multiple ? multiContainerRef.current : inputRef.current;

            DomHandler.alignOverlay(overlayRef.current, target, props.appendTo || (context && context.appendTo) || PrimeReact.appendTo);
        };

        const onPanelClick = (event) => {
            OverlayService.emit('overlay-click', {
                originalEvent: event,
                target: elementRef.current
            });
        };

        const onContainerClick = (event) => {
            setClicked(true);

            if (props.disabled || searchingState || props.loading || isInputClicked(event) || isDropdownClicked(event)) {
                return;
            }

            if (!overlayRef.current || !overlayRef.current.contains(event.target)) {
                DomHandler.focus(inputRef.current);
            }
        };

        const onDropdownClick = (event) => {
            if (props.dropdownAutoFocus) {
                DomHandler.focus(inputRef.current, props.dropdownAutoFocus);
            }

            if (props.dropdownMode === 'blank') search(event, '', 'dropdown');
            else if (props.dropdownMode === 'current') search(event, inputRef.current.value, 'dropdown');

            if (props.onDropdownClick) {
                props.onDropdownClick({
                    originalEvent: event,
                    query: inputRef.current.value
                });
            }
        };

        const removeItem = (event, index) => {
            const removedValue = props.value[index];
            const newValue = props.value.filter((_, i) => index !== i);

            updateModel(event, newValue);

            if (props.onUnselect) {
                props.onUnselect({
                    originalEvent: event,
                    value: removedValue
                });
            }
        };

        const removeOption = (event, index) => {
            const removedOption = props.value[index];
            const value = props.value.filter((_, i) => i !== index).map((option) => getOptionValue(option));

            updateModel(event, value);

            if (props.onUnselect) {
                props.onUnselect({
                    originalEvent: event,
                    value: removedOption
                });
            }

            setDirtyState(true);
            DomHandler.focus(inputRef.current);
        };

        const changeFocusedOptionIndex = (event, index) => {
            if (focusedOptionIndex !== index) {
                setFocusedOptionIndex(index);
                scrollInView();

                if (props.selectOnFocus || props.autoHighlight) {
                    onOptionSelect(event, visibleOptions()[index], false);
                }
            }
        };

        const focusedOptionId = () => {
            return focusedOptionIndex !== -1 ? `${props.id}_${focusedOptionIndex}` : null;
        };

        const scrollInView = (index = -1) => {
            const id = index !== -1 ? `${props.id}_${index}` : focusedOptionId();
            const element = DomHandler.findSingle(listRef.current, `li[id="${id}"]`);

            if (element) {
                element.scrollIntoView && element.scrollIntoView({ block: 'nearest', inline: 'start' });
            } else if (!virtualScrollerDisabled()) {
                virtualScrollerRef.current && virtualScrollerRef.current.scrollToIndex(index !== -1 ? index : focusedOptionIndex);
            }
        };

        const onArrowDownKey = (event) => {
            if (!overlayVisibleState) {
                return;
            }

            const optionIndex = focusedOptionIndex !== -1 ? findNextOptionIndex(focusedOptionIndex) : clicked ? findFirstOptionIndex() : findFirstFocusedOptionIndex();

            changeFocusedOptionIndex(event, optionIndex);

            event.preventDefault();
        };

        const onArrowUpKey = (event) => {
            if (!overlayVisibleState) {
                return;
            }

            if (event.altKey) {
                if (focusedOptionIndex !== -1) {
                    onOptionSelect(event, visibleOptions()[focusedOptionIndex]);
                }

                overlayVisibleState && hide();
                event.preventDefault();
            } else {
                const optionIndex = focusedOptionIndex !== -1 ? findPrevOptionIndex(focusedOptionIndex) : clicked ? findLastOptionIndex() : findLastFocusedOptionIndex();

                changeFocusedOptionIndex(event, optionIndex);

                event.preventDefault();
            }
        };

        const onArrowLeftKey = (event) => {
            const target = event.currentTarget;

            setFocusedOptionIndex(-1);

            if (props.multiple) {
                if (ObjectUtils.isEmpty(target.value) && hasSelectedOption()) {
                    DomHandler.focus(multiContainerRef.current);
                    setFocusedMultipleOptionIndex(props.value.length);
                } else {
                    event.stopPropagation(); // To prevent onArrowLeftKeyOnMultiple method
                }
            }
        };

        const onArrowRightKey = (event) => {
            setFocusedOptionIndex(-1);

            props.multiple && event.stopPropagation(); // To prevent onArrowRightKeyOnMultiple method
        };

        const onHomeKey = (event) => {
            const { currentTarget } = event;
            const len = currentTarget.value.length;

            currentTarget.setSelectionRange(0, event.shiftKey ? len : 0);
            setFocusedOptionIndex(-1);

            event.preventDefault();
        };

        const onEndKey = (event) => {
            const { currentTarget } = event;
            const len = currentTarget.value.length;

            currentTarget.setSelectionRange(event.shiftKey ? 0 : len, len);
            setFocusedOptionIndex(-1);

            event.preventDefault();
        };

        const onPageUpKey = (event) => {
            scrollInView(0);
            event.preventDefault();
        };

        const onPageDownKey = (event) => {
            scrollInView(visibleOptions().length - 1);
            event.preventDefault();
        };

        const onEnterKey = (event) => {
            if (!overlayVisibleState) {
                setFocusedOptionIndex(-1);

                onArrowDownKey(event);
            } else {
                if (focusedOptionIndex !== -1) {
                    onOptionSelect(event, visibleOptions()[focusedOptionIndex]);
                }

                hide();
            }

            event.preventDefault();
        };

        const onEscapeKey = (event) => {
            overlayVisibleState && hide(true);
            event.preventDefault();
        };

        const onTabKey = (event) => {
            if (focusedOptionIndex !== -1) {
                onOptionSelect(event, visibleOptions()[focusedOptionIndex]);
            }

            overlayVisibleState && hide();
        };

        const onBackspaceKey = (event) => {
            if (props.multiple) {
                if (ObjectUtils.isNotEmpty(props.value) && !inputRef.current.value) {
                    const removedValue = props.value[props.value.length - 1];
                    const newValue = props.value.slice(0, -1);

                    if (props.onChange) {
                        props.onChange({
                            originalEvent: event,
                            newValue,
                            stopPropagation: () => {
                                event.stopPropagation();
                            },
                            preventDefault: () => {
                                event.preventDefault();
                            },
                            target: {
                                name: props.name,
                                id: idState,
                                value
                            }
                        });
                    }

                    if (props.onUnselect) {
                        props.onUnselect({
                            originalEvent: event,
                            value: removedValue
                        });
                    }
                }

                event.stopPropagation(); // To prevent onBackspaceKeyOnMultiple method
            }
        };

        const onArrowLeftKeyOnMultiple = () => {
            setFocusedMultipleOptionIndex(focusedMultipleOptionIndex < 1 ? 0 : focusedMultipleOptionIndex - 1);
        };

        const onArrowRightKeyOnMultiple = () => {
            let currentFocusedMultipleOptionIndex = focusedMultipleOptionIndex + 1;

            setFocusedMultipleOptionIndex(currentFocusedMultipleOptionIndex);

            if (currentFocusedMultipleOptionIndex > props.value.length - 1) {
                setFocusedMultipleOptionIndex(-1);
                DomHandler.focus(inputRef.current);
            }
        };

        const onBackspaceKeyOnMultiple = (event) => {
            if (focusedMultipleOptionIndex !== -1) {
                removeOption(event, focusedMultipleOptionIndex);
            }
        };

        const onInput = (event) => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }

            let query = event.target.value;

            if (!props.multiple) {
                updateModel(event, query);
            }

            if (query.length === 0) {
                hide();
                props.onClear && props.onClear(event);
            } else {
                if (query.length >= props.minLength) {
                    setFocusedOptionIndex(-1);

                    searchTimeout.current = setTimeout(() => {
                        search(event, query, 'input');
                    }, props.delay);
                } else {
                    hide();
                }
            }
        };

        const onKeyDown = (event) => {
            if (props.disabled) {
                event.preventDefault();

                return;
            }

            switch (event.code) {
                case 'ArrowDown':
                    onArrowDownKey(event);
                    break;

                case 'ArrowUp':
                    onArrowUpKey(event);
                    break;

                case 'ArrowLeft':
                    onArrowLeftKey(event);
                    break;

                case 'ArrowRight':
                    onArrowRightKey(event);
                    break;

                case 'Home':
                    onHomeKey(event);
                    break;

                case 'End':
                    onEndKey(event);
                    break;

                case 'PageDown':
                    onPageDownKey(event);
                    break;

                case 'PageUp':
                    onPageUpKey(event);
                    break;

                case 'Enter':
                case 'NumpadEnter':
                    onEnterKey(event);
                    break;

                case 'Escape':
                    onEscapeKey(event);
                    break;

                case 'Tab':
                    onTabKey(event);
                    break;

                case 'Backspace':
                    onBackspaceKey(event);
                    break;

                case 'ShiftLeft':
                case 'ShiftRight':
                    //NOOP
                    break;

                default:
                    break;
            }

            setClicked(false);
        };

        const selectHighlightItem = (event, item) => {
            if (props.optionGroupLabel) {
                const optionGroup = props.suggestions[item.dataset.group];

                selectItem(event, getOptionGroupChildren(optionGroup)[item.dataset.index]);
            } else {
                selectItem(event, props.suggestions[item.getAttribute('index')]);
            }
        };

        const findNextItem = (item) => {
            const nextItem = item.nextElementSibling;

            return nextItem ? (DomHandler.getAttribute(nextItem, 'data-pc-section') === 'itemgroup' ? findNextItem(nextItem) : nextItem) : null;
        };

        const findPrevItem = (item) => {
            let prevItem = item.previousElementSibling;

            return prevItem ? (DomHandler.getAttribute(prevItem, 'data-pc-section') === 'itemgroup' ? findPrevItem(prevItem) : prevItem) : null;
        };

        const getOptionLabel = (option) => {
            return props.field || props.optionLabel ? ObjectUtils.resolveFieldData(option, props.field || props.optionLabel) : option;
        };

        const isOptionMatched = (option, value) => {
            return isValidOption(option) && getOptionLabel(option)?.toLocaleLowerCase(props.searchLocale) === value.toLocaleLowerCase(props.searchLocale);
        };

        const flatOptions = (options) => {
            return (options || []).reduce((result, option, index) => {
                result.push({ optionGroup: option, group: true, index });

                const optionGroupChildren = getOptionGroupChildren(option);

                optionGroupChildren && optionGroupChildren.forEach((o) => result.push(o));

                return result;
            }, []);
        };

        const equalityKey = () => {
            return props.dataKey;
        };

        const virtualScrollerDisabled = () => {
            return !props.virtualScrollerOptions;
        };

        const hasSelectedOption = () => {
            return ObjectUtils.isNotEmpty(props.value);
        };

        const visibleOptions = () => {
            return props.optionGroupLabel ? flatOptions(props.suggestions) : props.suggestions || [];
        };

        const isOptionDisabled = (option) => {
            return props.optionDisabled ? ObjectUtils.resolveFieldData(option, props.optionDisabled) : false;
        };

        const isOptionGroup = (option) => {
            return props.optionGroupLabel && option.optionGroup && option.group;
        };

        const isValidOption = (option) => {
            return ObjectUtils.isNotEmpty(option) && !(isOptionDisabled(option) || isOptionGroup(option));
        };

        const isValidSelectedOption = (option) => {
            return isValidOption(option) && isSelected(option);
        };

        const findSelectedOptionIndex = () => {
            return hasSelectedOption() ? visibleOptions().findIndex((option) => isValidSelectedOption(option)) : -1;
        };

        const findFirstOptionIndex = () => {
            return visibleOptions().findIndex((option) => isValidOption(option));
        };

        const findNextOptionIndex = (index) => {
            const matchedOptionIndex =
                index < visibleOptions().length - 1
                    ? visibleOptions()
                          .slice(index + 1)
                          .findIndex((option) => isValidOption(option))
                    : -1;

            return matchedOptionIndex > -1 ? matchedOptionIndex + index + 1 : index;
        };

        const findLastOptionIndex = () => {
            return ObjectUtils.findLastIndex(visibleOptions(), (option) => isValidOption(option));
        };

        const findLastFocusedOptionIndex = () => {
            const selectedIndex = findSelectedOptionIndex();

            return selectedIndex < 0 ? findLastOptionIndex() : selectedIndex;
        };

        const findPrevOptionIndex = (index) => {
            const matchedOptionIndex = index > 0 ? ObjectUtils.findLastIndex(visibleOptions().slice(0, index), (option) => isValidOption(option)) : -1;

            return matchedOptionIndex > -1 ? matchedOptionIndex : index;
        };

        const findFirstFocusedOptionIndex = () => {
            const selectedIndex = findSelectedOptionIndex();

            return selectedIndex < 0 ? findFirstOptionIndex() : selectedIndex;
        };

        const onFocus = (event) => {
            if (props.disabled) {
                // For ScreenReaders
                return;
            }

            if (!dirtyState && props.completeOnFocus) {
                search(event, event.target.value, 'focus');
            }

            setDirtyState(true);
            setFocusedState(true);

            if (overlayVisibleState) {
                const currentFocusedOptionIndex = focusedOptionIndex !== -1 ? focusedOptionIndex : overlayVisibleState && props.autoOptionFocus ? findFirstFocusedOptionIndex() : -1;

                scrollInView(currentFocusedOptionIndex);
                setFocusedOptionIndex(currentFocusedOptionIndex);
            }

            props.onFocus && props.onFocus(event);
        };

        const forceItemSelection = (event) => {
            if (props.multiple) {
                inputRef.current.value = '';

                return;
            }

            const inputValue = ObjectUtils.trim(event.target.value);
            const item = (props.suggestions || []).find((it) => {
                const value = props.field ? ObjectUtils.resolveFieldData(it, props.field) : it;

                return value && inputValue === ObjectUtils.trim(value);
            });

            if (item) {
                selectItem(event, item, true);
            } else {
                inputRef.current.value = '';
                updateModel(event, null);

                props.onClear && props.onClear(event);
            }
        };

        const onBlur = (event) => {
            setFocusedState(false);

            setFocusedOptionIndex(-1);

            if (props.forceSelection) {
                forceItemSelection(event);
            }

            props.onBlur && props.onBlur(event);
        };

        const onMultipleContainerFocus = () => {
            if (props.disabled) {
                // For ScreenReaders
                return;
            }

            setFocusedState(true);
        };

        const onMultipleContainerBlur = () => {
            setFocusedMultipleOptionIndex(-1);
            setFocusedState(false);
        };

        const onMultiContainerClick = (event) => {
            DomHandler.focus(inputRef.current);

            props.onClick && props.onClick(event);
        };

        const onMultipleContainerKeyDown = (event) => {
            if (props.disabled) {
                event.preventDefault();

                return;
            }

            switch (event.code) {
                case 'ArrowLeft':
                    onArrowLeftKeyOnMultiple(event);
                    break;

                case 'ArrowRight':
                    onArrowRightKeyOnMultiple(event);
                    break;

                case 'Backspace':
                    onBackspaceKeyOnMultiple(event);
                    break;

                default:
                    break;
            }
        };

        const isSelected = (option) => {
            return ObjectUtils.equals(props.value, getOptionValue(option), equalityKey());
        };

        const findOptionIndex = (option) => {
            return props.suggestions ? props.suggestions.findIndex((s) => ObjectUtils.equals(s, option)) : -1;
        };

        const getScrollableElement = () => {
            return overlayRef.current.firstChild;
        };

        const getOptionGroupLabel = (optionGroup) => {
            return props.optionGroupLabel ? ObjectUtils.resolveFieldData(optionGroup, props.optionGroupLabel) : optionGroup;
        };

        const getOptionGroupChildren = (optionGroup) => {
            return ObjectUtils.resolveFieldData(optionGroup, props.optionGroupChildren);
        };

        const isAllowMoreValues = () => {
            return !props.value || !props.selectionLimit || props.value.length < props.selectionLimit;
        };

        React.useEffect(() => {
            ObjectUtils.combinedRefs(inputRef, props.inputRef);
        }, [inputRef, props.inputRef]);

        useMountEffect(() => {
            if (!idState) {
                setIdState(UniqueComponentId());
            }

            if (props.autoFocus) {
                DomHandler.focus(inputRef.current, props.autoFocus);
            }

            alignOverlay();
        });

        useUpdateEffect(() => {
            if (searchingState) {
                ObjectUtils.isNotEmpty(props.suggestions) || props.showEmptyMessage ? show() : hide();
                setSearchingState(false);
            }
        }, [props.suggestions]);

        useUpdateEffect(() => {
            if (inputRef.current && !props.multiple) {
                updateInputField(props.value);
            }

            if (overlayVisibleState) {
                alignOverlay();
            }
        });

        useUnmountEffect(() => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }

            ZIndexUtils.clear(overlayRef.current);
        });

        React.useImperativeHandle(ref, () => ({
            props,
            search,
            show,
            hide,
            focus: () => DomHandler.focus(inputRef.current),
            getElement: () => elementRef.current,
            getOverlay: () => overlayRef.current,
            getInput: () => inputRef.current,
            getVirtualScroller: () => virtualScrollerRef.current
        }));

        const createSimpleAutoComplete = () => {
            const value = formatValue(props.value);
            const ariaControls = overlayVisibleState ? idState + '_list' : null;

            return (
                <InputText
                    ref={inputRef}
                    id={props.inputId}
                    type={props.type}
                    name={props.name}
                    defaultValue={value}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls={ariaControls}
                    aria-haspopup="listbox"
                    aria-expanded={overlayVisibleState}
                    className={classNames(props.inputClassName, cx('input'))}
                    style={props.inputStyle}
                    autoComplete="off"
                    readOnly={props.readOnly}
                    required={props.required}
                    disabled={props.disabled}
                    placeholder={props.placeholder}
                    size={props.size}
                    maxLength={props.maxLength}
                    tabIndex={props.tabIndex}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    onChange={onChange}
                    onMouseDown={props.onMouseDown}
                    onKeyUp={props.onKeyUp}
                    onKeyDown={onKeyDown}
                    onInput={onInput}
                    onKeyPress={props.onKeyPress}
                    onContextMenu={props.onContextMenu}
                    onClick={props.onClick}
                    onDoubleClick={props.onDblClick}
                    pt={ptm('input')}
                    {...ariaProps}
                    __parentMetadata={{ parent: metaData }}
                />
            );
        };

        const createChips = () => {
            if (ObjectUtils.isNotEmpty(props.value)) {
                return props.value.map((val, index) => {
                    const key = index + 'multi-item';
                    const removeTokenIconProps = mergeProps(
                        {
                            className: cx('removeTokenIcon'),
                            onClick: (e) => removeItem(e, index)
                        },
                        ptm('removeTokenIcon')
                    );
                    const icon = props.removeTokenIcon || <TimesCircleIcon {...removeTokenIconProps} />;
                    const removeTokenIcon = !props.disabled && IconUtils.getJSXIcon(icon, { ...removeTokenIconProps }, { props });
                    const tokenProps = mergeProps(
                        {
                            className: cx('token')
                        },
                        ptm('token')
                    );
                    const tokenLabelProps = mergeProps(
                        {
                            className: cx('tokenLabel')
                        },
                        ptm('tokenLabel')
                    );

                    return (
                        <li key={key} {...tokenProps}>
                            <span {...tokenLabelProps}>{formatValue(val)}</span>
                            {removeTokenIcon}
                        </li>
                    );
                });
            }

            selectedItem.current = null;

            return null;
        };

        const createMultiInput = (allowMoreValues) => {
            const ariaControls = overlayVisibleState ? idState + '_list' : null;
            const inputTokenProps = mergeProps(
                {
                    className: cx('inputToken')
                },
                ptm('inputToken')
            );
            const inputProps = mergeProps(
                {
                    id: props.inputId,
                    ref: inputRef,
                    'aria-autocomplete': 'list',
                    'aria-controls': ariaControls,
                    'aria-expanded': overlayVisibleState,
                    'aria-haspopup': 'listbox',
                    autoComplete: 'off',
                    className: props.inputClassName,
                    disabled: props.disabled,
                    maxLength: props.maxLength,
                    name: props.name,
                    onBlur: onBlur,
                    onChange: allowMoreValues ? onChange : undefined,
                    onFocus: onFocus,
                    onKeyDown: allowMoreValues ? onKeyDown : undefined,
                    onInput: onInput,
                    onKeyPress: props.onKeyPress,
                    onKeyUp: props.onKeyUp,
                    placeholder: allowMoreValues ? props.placeholder : undefined,
                    readOnly: props.readOnly || !allowMoreValues,
                    required: props.required,
                    role: 'combobox',
                    style: props.inputStyle,
                    tabIndex: props.tabIndex,
                    type: props.type,
                    ...ariaProps
                },
                ptm('input')
            );

            return (
                <li {...inputTokenProps}>
                    <input {...inputProps} />
                </li>
            );
        };

        const createMultipleAutoComplete = () => {
            const allowMoreValues = isAllowMoreValues();
            const tokens = createChips();
            const input = createMultiInput(allowMoreValues);
            const containerProps = mergeProps(
                {
                    ref: multiContainerRef,
                    className: cx('container'),
                    onClick: allowMoreValues ? onMultiContainerClick : undefined,
                    onFocus: onMultipleContainerFocus,
                    onBlur: onMultipleContainerBlur,
                    onKeyDown: onMultipleContainerKeyDown,
                    onContextMenu: props.onContextMenu,
                    onMouseDown: props.onMouseDown,
                    onDoubleClick: props.onDblClick,
                    tabIndex: '-1',
                    role: 'listbox',
                    'data-p-focus': focusedState,
                    'data-p-disabled': props.disabled
                },
                ptm('container')
            );

            return (
                <ul {...containerProps}>
                    {tokens}
                    {input}
                </ul>
            );
        };

        const createDropdown = () => {
            if (props.dropdown) {
                const ariaLabel = props.dropdownAriaLabel || props.placeholder || localeOption('choose');

                return (
                    <Button
                        ref={dropdownButtonRef}
                        type="button"
                        icon={props.dropdownIcon || <ChevronDownIcon />}
                        className={cx('dropdownButton')}
                        disabled={props.disabled}
                        onClick={onDropdownClick}
                        aria-label={ariaLabel}
                        pt={ptm('dropdownButton')}
                        __parentMetadata={{ parent: metaData }}
                    />
                );
            }

            return null;
        };

        const createLoader = () => {
            if (searchingState) {
                const loadingIconProps = mergeProps(
                    {
                        className: cx('loadingIcon')
                    },
                    ptm('loadingIcon')
                );
                const icon = props.loadingIcon || <SpinnerIcon {...loadingIconProps} spin />;
                const loaderIcon = IconUtils.getJSXIcon(icon, { ...loadingIconProps }, { props });

                return loaderIcon;
            }

            return null;
        };

        const createInput = () => {
            return props.multiple ? createMultipleAutoComplete() : createSimpleAutoComplete();
        };

        const listId = idState + '_list';
        const hasTooltip = ObjectUtils.isNotEmpty(props.tooltip);
        const otherProps = AutoCompleteBase.getOtherProps(props);
        const ariaProps = ObjectUtils.reduceKeys(otherProps, DomHandler.ARIA_PROPS);
        const loader = createLoader();
        const input = createInput();
        const dropdown = createDropdown();
        const rootProps = mergeProps(
            {
                id: idState,
                ref: elementRef,
                style: props.style,
                onClick: onContainerClick,
                className: classNames(props.className, cx('root', { focusedState }))
            },
            otherProps,
            ptm('root')
        );

        return (
            <>
                <span {...rootProps}>
                    {input}
                    {loader}
                    {dropdown}
                    <AutoCompletePanel
                        hostName="AutoComplete"
                        ref={overlayRef}
                        listRef={listRef}
                        virtualScrollerRef={virtualScrollerRef}
                        {...props}
                        listId={listId}
                        isSelected={isSelected}
                        onItemClick={selectItem}
                        selectedItem={selectedItem}
                        onClick={onPanelClick}
                        getOptionGroupLabel={getOptionGroupLabel}
                        focusedOptionIndex={focusedOptionIndex}
                        getOptionGroupChildren={getOptionGroupChildren}
                        in={overlayVisibleState}
                        onEnter={onOverlayEnter}
                        onEntering={onOverlayEntering}
                        onEntered={onOverlayEntered}
                        onExit={onOverlayExit}
                        onExited={onOverlayExited}
                        ptm={ptm}
                        cx={cx}
                        sx={sx}
                    />
                </span>
                {hasTooltip && <Tooltip target={elementRef} content={props.tooltip} pt={ptm('tooltip')} {...props.tooltipOptions} />}
            </>
        );
    })
);

AutoComplete.displayName = 'AutoComplete';
