// TODO: Add limitation for maximum number of selected items [DONE]
// TODO: Add text item portal component [DONE]
// TODO: Add deselect button component [DONE]
// TODO: Add hideSelectedOption toggle [DONE]
// TODO: Add user friendly focus after item selected when hideSelectedOption is true
// TODO: Hide groups when all items from group were selected and hideSelectedOption is true
// TODO: Fix tab order for values chips

import type { Scope } from '@radix-ui/react-context'
import type { MouseEventHandler } from 'react'

import { clamp } from '@radix-ui/number'
import { composeEventHandlers } from '@radix-ui/primitive'
import { createCollection } from '@radix-ui/react-collection'
import { useComposedRefs } from '@radix-ui/react-compose-refs'
import { createContextScope } from '@radix-ui/react-context'
import { useDirection } from '@radix-ui/react-direction'
import { DismissableLayer } from '@radix-ui/react-dismissable-layer'
import { useFocusGuards } from '@radix-ui/react-focus-guards'
import { FocusScope } from '@radix-ui/react-focus-scope'
import * as PopperPrimitive from '@radix-ui/react-popper'
import { createPopperScope } from '@radix-ui/react-popper'
import { Portal as PortalPrimitive } from '@radix-ui/react-portal'
import { Primitive } from '@radix-ui/react-primitive'
import { createSlot } from '@radix-ui/react-slot'
import { useCallbackRef } from '@radix-ui/react-use-callback-ref'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useLayoutEffect } from '@radix-ui/react-use-layout-effect'
import { hideOthers } from 'aria-hidden'
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as ReactDOM from 'react-dom'
import { RemoveScroll } from 'react-remove-scroll'

type Direction = 'ltr' | 'rtl'

const OPEN_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown']
const SELECTION_KEYS = [' ', 'Enter']
const CONTENT_MARGIN = 10

const MULTI_SELECT_NAME = 'MultiSelect'
const TRIGGER_NAME = 'MultiSelectTrigger'
const VALUE_NAME = 'MultiSelectValue'
const ICON_NAME = 'MultiSelectIcon'
const PORTAL_NAME = 'MultiSelectPortal'
const CONTENT_NAME = 'MultiSelectContent'
const CONTENT_IMPL_NAME = 'MultiSelectContentImpl'
const POPPER_POSITION_NAME = 'SelectPopperPosition'
const VIEWPORT_NAME = 'MultiSelectViewport'
const ITEM_ALIGNED_POSITION_NAME = 'MultiSelectItemAlignedPosition'
const GROUP_NAME = 'MultiSelectGroup'
const LABEL_NAME = 'MultiSelectLabel'
const ITEM_NAME = 'MultiSelectItem'
const ITEM_TEXT_NAME = 'MultiSelectItemText'
const ITEM_INDICATOR_NAME = 'SelectItemIndicator'
const SCROLL_UP_BUTTON_NAME = 'SelectScrollUpButton'
const SCROLL_DOWN_BUTTON_NAME = 'SelectScrollDownButton'
const ARROW_NAME = 'MultiSelectArrow'
const SEPARATOR_NAME = 'SelectSeparator'

/* ------------------------------------------------------------------------------------------------- */

interface ItemData {
  disabled: boolean
  textValue: string
  value: string
}
const [
  {
    Provider: CollectionProvider,
    Slot: CollectionSlot,
    ItemSlot: CollectionItemSlot,
  },
  useCollection,
  createCollectionScope,
] = createCollection<MultiSelectItemElement, ItemData>(
  MULTI_SELECT_NAME,
)

type ScopedProps<P> = P & { __scopeMultiSelect?: Scope }
const [createMultiSelectContext, createMultiSelectScope] =
  createContextScope(MULTI_SELECT_NAME, [
    createCollectionScope,
    createPopperScope,
  ])

const usePopperScope = createPopperScope()

/* ------------------------------------------------------------------------------------------------- */

interface MultiSelectContextValue {
  contentId: string
  dir: MultiSelectProps['dir']
  disabled?: boolean
  hideSelectedOptions: boolean
  maxValues: number
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>
  onValueChange: React.Dispatch<React.SetStateAction<string[]>>
  open: boolean
  required?: boolean
  trigger: MultiSelectTriggerElement | null
  value: string[]
  valueMap: Record<string, number>
  valueNode: MultiSelectValueElement | null
  valueNodeHasChildren: boolean
  onTriggerChange: (node: MultiSelectTriggerElement | null) => void
  onValueNodeChange: (node: MultiSelectValueElement) => void
  onValueNodeHasChildrenChange: (hasChildren: boolean) => void
  triggerPointerDownPosRef: React.RefObject<{
    x: number
    y: number
  } | null>
}

const [MultiSelectProvider, useMultiSelectContext] =
  createMultiSelectContext<MultiSelectContextValue>(MULTI_SELECT_NAME)

interface MultiSelectContentContextValue {
  content?: MultiSelectContentElement | null
  isPositioned?: boolean
  position?: MultiSelectContentProps['position']
  selectedItem?: MultiSelectItemElement | null
  selectedItemText?: MultiSelectItemTextElement | null
  viewport?: MultiSelectViewportElement | null
  focusSelectedItem?: () => void
  itemRefCallback?: (
    node: MultiSelectItemElement | null,
    value: string,
    disabled: boolean,
  ) => void
  itemTextRefCallback?: (
    node: MultiSelectItemTextElement | null,
    value: string,
    disabled: boolean,
  ) => void
  onItemLeave?: () => void
  onViewportChange?: (node: MultiSelectViewportElement | null) => void
}

const [MultiSelectContentProvider, useMultiSelectContentContext] =
  createMultiSelectContext<MultiSelectContentContextValue>(
    CONTENT_NAME,
  )

interface MultiSelectViewportContextValue {
  contentWrapper?: HTMLDivElement | null
  shouldExpandOnScrollRef?: React.RefObject<boolean>
  onScrollButtonChange?: (
    node: MultiSelectScrollButtonImplElement | null,
  ) => void
}

const [MultiSelectViewportProvider, useMultiSelectViewportContext] =
  createMultiSelectContext<MultiSelectViewportContextValue>(
    CONTENT_NAME,
    {},
  )

interface MultiSelectGroupContextValue {
  id: string
}

const [MultiSelectGroupContextProvider, useMultiSelectGroupContext] =
  createMultiSelectContext<MultiSelectGroupContextValue>(GROUP_NAME)

interface MultiSelectItemContextValue {
  disabled: boolean
  isSelected: boolean
  rootRef: React.RefObject<HTMLDivElement | null>
  textId: string
  value: string
  onItemTextChange: (node: MultiSelectItemTextElement | null) => void
}

const [MultiSelectItemContextProvider, useMultiSelectItemContext] =
  createMultiSelectContext<MultiSelectItemContextValue>(ITEM_NAME)

/* -------------------------------------------------------------------------------------------------
 * Select
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectProps {
  children?: React.ReactNode
  defaultOpen?: boolean
  defaultValue?: string[]
  dir?: Direction
  disabled?: boolean
  hideSelectedOptions?: boolean
  maxValues?: number
  open?: boolean
  required?: boolean
  value?: string[]
  onOpenChange?: (open: boolean) => void
  onValueChange?: (value: string[]) => void
}

const MultiSelect = ({
  __scopeMultiSelect,
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  value: valueProp,
  defaultValue,
  onValueChange,
  dir,
  disabled,
  required,
  maxValues = Infinity,
  hideSelectedOptions = false,
}: ScopedProps<MultiSelectProps>): React.JSX.Element => {
  const popperScope = usePopperScope(__scopeMultiSelect)
  const [trigger, setTrigger] =
    useState<MultiSelectTriggerElement | null>(null)
  const [valueNode, setValueNode] =
    useState<MultiSelectValueElement | null>(null)
  const [valueNodeHasChildren, setValueNodeHasChildren] =
    useState(false)
  const direction = useDirection(dir)
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: MULTI_SELECT_NAME,
  })
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? [],
    onChange: onValueChange as any,
    caller: MULTI_SELECT_NAME,
  })
  const triggerPointerDownPosRef = useRef<{
    x: number
    y: number
  } | null>(null)

  const valueMap = useMemo(
    () =>
      Object.fromEntries(value.map((value, index) => [value, index])),
    [value],
  )

  return (
    <PopperPrimitive.Root {...popperScope}>
      <MultiSelectProvider
        dir={direction}
        disabled={disabled}
        maxValues={maxValues}
        required={required}
        trigger={trigger}
        value={value}
        valueMap={valueMap}
        contentId={useId()}
        hideSelectedOptions={hideSelectedOptions}
        onOpenChange={setOpen}
        onTriggerChange={setTrigger}
        onValueChange={setValue}
        onValueNodeChange={setValueNode}
        onValueNodeHasChildrenChange={setValueNodeHasChildren}
        open={open}
        scope={__scopeMultiSelect}
        triggerPointerDownPosRef={triggerPointerDownPosRef}
        valueNode={valueNode}
        valueNodeHasChildren={valueNodeHasChildren}
      >
        <CollectionProvider scope={__scopeMultiSelect}>
          {children}
        </CollectionProvider>
      </MultiSelectProvider>
    </PopperPrimitive.Root>
  )
}

MultiSelect.displayName = MULTI_SELECT_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectTrigger
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectTriggerElement = React.ComponentRef<
  typeof Primitive.div
>
interface MultiSelectTriggerProps
  extends React.ComponentProps<typeof Primitive.div> {
  disabled?: boolean
}

const MultiSelectTrigger = ({
  ref,
  __scopeMultiSelect,
  disabled = false,
  onClick,
  onKeyDown,
  onPointerDown,
  ...props
}: ScopedProps<MultiSelectTriggerProps>): React.JSX.Element => {
  const popperScope = usePopperScope(__scopeMultiSelect)
  const context = useMultiSelectContext(
    TRIGGER_NAME,
    __scopeMultiSelect,
  )
  const isDisabled = context.disabled || disabled
  const composedRefs = useComposedRefs(ref, context.onTriggerChange)
  const pointerTypeRef =
    useRef<React.PointerEvent['pointerType']>('touch')

  const handleOpen = (
    pointerEvent?: React.MouseEvent | React.PointerEvent,
  ): void => {
    if (!isDisabled) {
      context.onOpenChange(true)
    }

    if (pointerEvent) {
      context.triggerPointerDownPosRef.current = {
        x: Math.round(pointerEvent.pageX),
        y: Math.round(pointerEvent.pageY),
      }
    }
  }

  return (
    <PopperPrimitive.Anchor asChild {...popperScope}>
      <Primitive.div
        ref={composedRefs}
        aria-expanded={context.open}
        aria-required={context.required}
        data-disabled={isDisabled ? '' : undefined}
        data-state={context.open ? 'open' : 'closed'}
        dir={context.dir}
        tabIndex={isDisabled ? -1 : 0}
        aria-autocomplete='none'
        aria-controls={context.contentId}
        data-placeholder={
          shouldShowPlaceholder(context.value) ? '' : undefined
        }
        onClick={composeEventHandlers(onClick, (event) => {
          // Whilst browsers generally have no issue focusing the trigger when clicking
          // on a label, Safari seems to struggle with the fact that there's no `onClick`.
          // We force `focus` in this case. Note: this doesn't create any other side-effect
          // because we are preventing default in `onPointerDown` so effectively
          // this only runs for a label "click"
          event.currentTarget.focus()

          // Open on click when using a touch or pen device
          if (pointerTypeRef.current !== 'mouse') {
            handleOpen(event)
          }
        })}
        onKeyDown={composeEventHandlers(onKeyDown, (event) => {
          if (OPEN_KEYS.includes(event.key)) {
            handleOpen()
            event.preventDefault()
          }
        })}
        onPointerDown={composeEventHandlers(
          onPointerDown,
          (event) => {
            pointerTypeRef.current = event.pointerType

            // prevent implicit pointer capture
            // https://www.w3.org/TR/pointerevents3/#implicit-pointer-capture
            const target = event.target as HTMLElement
            if (target.hasPointerCapture(event.pointerId)) {
              target.releasePointerCapture(event.pointerId)
            }

            // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
            // but not when the control key is pressed (avoiding MacOS right click); also not for touch
            // devices because that would open the menu on scroll. (pen devices behave as touch on iOS).
            if (
              event.button === 0 &&
              event.ctrlKey === false &&
              event.pointerType === 'mouse'
            ) {
              handleOpen(event)
              // prevent trigger from stealing focus from the active item after opening.
              event.preventDefault()
            }
          },
        )}
        role='combobox'
        {...props}
      />
    </PopperPrimitive.Anchor>
  )
}

MultiSelectTrigger.displayName = TRIGGER_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectValue
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectValueElement = React.ComponentRef<
  typeof Primitive.span
>

interface MultiSelectValueProps
  extends Omit<
    React.ComponentProps<typeof Primitive.span>,
    'placeholder'
  > {
  placeholder?: React.ReactNode
}

const MultiSelectValue = ({
  ref: forwardedRef,
  ...props
}: ScopedProps<MultiSelectValueProps>): React.JSX.Element => {
  // We ignore `className` and `style` as this part shouldn't be styled.
  const {
    __scopeMultiSelect,
    className,
    style,
    children,
    placeholder = '',
    ...valueProps
  } = props
  const context = useMultiSelectContext(
    VALUE_NAME,
    __scopeMultiSelect,
  )
  const { onValueNodeHasChildrenChange } = context
  const hasChildren = children !== undefined
  const composedRefs = useComposedRefs(
    forwardedRef,
    context.onValueNodeChange,
  )

  useLayoutEffect(() => {
    onValueNodeHasChildrenChange(hasChildren)
  }, [onValueNodeHasChildrenChange, hasChildren])

  return (
    <Primitive.span
      {...valueProps}
      ref={composedRefs}
      // we don't want events from the portalled `SelectValue` children to bubble
      // through the item they came from
      style={{ pointerEvents: 'none' }}
    >
      {shouldShowPlaceholder(context.value) ? (
        <>{placeholder}</>
      ) : (
        children
      )}
    </Primitive.span>
  )
}

MultiSelectValue.displayName = VALUE_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectIcon
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectIconProps
  extends React.ComponentProps<typeof Primitive.span> {}

const MultiSelectIcon = ({
  __scopeMultiSelect,
  children,
  ...props
}: ScopedProps<MultiSelectIconProps>): React.JSX.Element => (
  <Primitive.span aria-hidden {...props}>
    {children || '▼'}
  </Primitive.span>
)

MultiSelectIcon.displayName = ICON_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectPortal
 * -----------------------------------------------------------------------------------------------*/

type PortalProps = React.ComponentProps<typeof PortalPrimitive>
interface MultiSelectPortalProps {
  children?: React.ReactNode
  container?: PortalProps['container']
}

const MultiSelectPortal = (
  props: ScopedProps<MultiSelectPortalProps>,
): React.JSX.Element => <PortalPrimitive asChild {...props} />

MultiSelectPortal.displayName = PORTAL_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectPopperPosition
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectPopperPositionElement = React.ComponentRef<
  typeof PopperPrimitive.Content
>
type PopperContentProps = React.ComponentPropsWithoutRef<
  typeof PopperPrimitive.Content
>
interface MultiSelectPopperPositionProps
  extends PopperContentProps,
    MultiSelectPopperPrivateProps {
  ref?: React.Ref<MultiSelectPopperPositionElement | null>
}

const MultiSelectPopperPosition = ({
  __scopeMultiSelect,
  align = 'start',
  collisionPadding = CONTENT_MARGIN,
  style,
  ...props
}: ScopedProps<MultiSelectPopperPositionProps>): React.JSX.Element => {
  const popperScope = usePopperScope(__scopeMultiSelect)

  return (
    <PopperPrimitive.Content
      {...popperScope}
      {...props}
      style={{
        boxSizing: 'border-box',
        ...style,
        ...{
          '--radix-multi-select-content-transform-origin':
            'var(--radix-popper-transform-origin)',
          '--radix-multi-select-content-available-width':
            'var(--radix-popper-available-width)',
          '--radix-multi-select-content-available-height':
            'var(--radix-popper-available-height)',
          '--radix-multi-select-trigger-width':
            'var(--radix-popper-anchor-width)',
          '--radix-multi-select-trigger-height':
            'var(--radix-popper-anchor-height)',
        },
      }}
      align={align}
      collisionPadding={collisionPadding}
    />
  )
}

MultiSelectPopperPosition.displayName = POPPER_POSITION_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectViewport
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectViewportElement = React.ComponentRef<
  typeof Primitive.div
>
interface MultiSelectViewportProps
  extends React.ComponentProps<typeof Primitive.div> {
  nonce?: string
}

const MultiSelectViewport = ({
  __scopeMultiSelect,
  nonce,
  ref,
  style,
  onScroll,
  ...props
}: ScopedProps<MultiSelectViewportProps>): React.JSX.Element => {
  const contentContext = useMultiSelectContentContext(
    VIEWPORT_NAME,
    __scopeMultiSelect,
  )
  const viewportContext = useMultiSelectViewportContext(
    VIEWPORT_NAME,
    __scopeMultiSelect,
  )
  const composedRefs = useComposedRefs(
    ref,
    contentContext.onViewportChange,
  )
  const prevScrollTopRef = useRef(0)
  return (
    <>
      {/* Hide scrollbars cross-browser and enable momentum scroll for touch devices */}
      <style
        dangerouslySetInnerHTML={{
          __html: `[data-radix-multi-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-multi-select-viewport]::-webkit-scrollbar{display:none}`,
        }}
        nonce={nonce}
      />
      <CollectionSlot scope={__scopeMultiSelect}>
        <Primitive.div
          ref={composedRefs}
          style={{
            // we use position: 'relative' here on the `viewport` so that when we call
            // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
            // (independent of the scrollUpButton).
            position: 'relative',
            flex: 1,
            // Viewport should only be scrollable in the vertical direction.
            // This won't work in vertical writing modes, so we'll need to
            // revisit this if/when that is supported
            // https://developer.chrome.com/blog/vertical-form-controls
            overflow: 'hidden auto',
            ...style,
          }}
          data-radix-multi-select-viewport=''
          onScroll={composeEventHandlers(onScroll, (event) => {
            const viewport = event.currentTarget
            const { contentWrapper, shouldExpandOnScrollRef } =
              viewportContext
            if (shouldExpandOnScrollRef?.current && contentWrapper) {
              const scrolledBy = Math.abs(
                prevScrollTopRef.current - viewport.scrollTop,
              )
              if (scrolledBy > 0) {
                const availableHeight =
                  window.innerHeight - CONTENT_MARGIN * 2
                const cssMinHeight = Number.parseFloat(
                  contentWrapper.style.minHeight,
                )
                const cssHeight = Number.parseFloat(
                  contentWrapper.style.height,
                )
                const prevHeight = Math.max(cssMinHeight, cssHeight)

                if (prevHeight < availableHeight) {
                  const nextHeight = prevHeight + scrolledBy
                  const clampedNextHeight = Math.min(
                    availableHeight,
                    nextHeight,
                  )
                  const heightDiff = nextHeight - clampedNextHeight

                  contentWrapper.style.height = `${clampedNextHeight}px`
                  if (contentWrapper.style.bottom === '0px') {
                    viewport.scrollTop =
                      heightDiff > 0 ? heightDiff : 0
                    // ensure the content stays pinned to the bottom
                    contentWrapper.style.justifyContent = 'flex-end'
                  }
                }
              }
            }
            prevScrollTopRef.current = viewport.scrollTop
          })}
          role='presentation'
          {...props}
        />
      </CollectionSlot>
    </>
  )
}

MultiSelectViewport.displayName = VIEWPORT_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectItemAlignedPosition
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectItemAlignedPositionElement = React.ComponentRef<
  typeof Primitive.div
>
interface MultiSelectItemAlignedPositionProps
  extends React.ComponentProps<typeof Primitive.div>,
    MultiSelectPopperPrivateProps {}

const MultiSelectItemAlignedPosition = ({
  __scopeMultiSelect,
  ref,
  onPlaced,
  ...popperProps
}: ScopedProps<MultiSelectItemAlignedPositionProps>): React.JSX.Element => {
  const context = useMultiSelectContext(
    CONTENT_NAME,
    __scopeMultiSelect,
  )
  const contentContext = useMultiSelectContentContext(
    CONTENT_NAME,
    __scopeMultiSelect,
  )
  const [contentWrapper, setContentWrapper] =
    useState<HTMLDivElement | null>(null)
  const [content, setContent] =
    useState<MultiSelectItemAlignedPositionElement | null>(null)
  const composedRefs = useComposedRefs(ref, setContent)
  const getItems = useCollection(__scopeMultiSelect)
  const shouldExpandOnScrollRef = useRef(false)
  const shouldRepositionRef = useRef(true)

  const {
    viewport,
    selectedItem,
    selectedItemText,
    focusSelectedItem,
  } = contentContext
  const position = useCallback(() => {
    if (
      context.trigger &&
      context.valueNode &&
      contentWrapper &&
      content &&
      viewport &&
      selectedItem &&
      selectedItemText
    ) {
      const triggerRect = context.trigger.getBoundingClientRect()

      // -----------------------------------------------------------------------------------------
      //  Horizontal positioning
      // -----------------------------------------------------------------------------------------
      const contentRect = content.getBoundingClientRect()
      const valueNodeRect = context.valueNode.getBoundingClientRect()
      const itemTextRect = selectedItemText.getBoundingClientRect()

      if (context.dir !== 'rtl') {
        const itemTextOffset = itemTextRect.left - contentRect.left
        const left = valueNodeRect.left - itemTextOffset
        const leftDelta = triggerRect.left - left
        const minContentWidth = triggerRect.width + leftDelta
        const contentWidth = Math.max(
          minContentWidth,
          contentRect.width,
        )
        const rightEdge = window.innerWidth - CONTENT_MARGIN
        const clampedLeft = clamp(left, [
          CONTENT_MARGIN,
          // Prevents the content from going off the starting edge of the
          // viewport. It may still go off the ending edge, but this can be
          // controlled by the user since they may want to manage overflow in a
          // specific way.
          // https://github.com/radix-ui/primitives/issues/2049
          Math.max(CONTENT_MARGIN, rightEdge - contentWidth),
        ])

        contentWrapper.style.minWidth = `${minContentWidth}px`
        contentWrapper.style.left = `${clampedLeft}px`
      } else {
        const itemTextOffset = contentRect.right - itemTextRect.right
        const right =
          window.innerWidth - valueNodeRect.right - itemTextOffset
        const rightDelta =
          window.innerWidth - triggerRect.right - right
        const minContentWidth = triggerRect.width + rightDelta
        const contentWidth = Math.max(
          minContentWidth,
          contentRect.width,
        )
        const leftEdge = window.innerWidth - CONTENT_MARGIN
        const clampedRight = clamp(right, [
          CONTENT_MARGIN,
          Math.max(CONTENT_MARGIN, leftEdge - contentWidth),
        ])

        contentWrapper.style.minWidth = `${minContentWidth}px`
        contentWrapper.style.right = `${clampedRight}px`
      }

      // -----------------------------------------------------------------------------------------
      // Vertical positioning
      // -----------------------------------------------------------------------------------------
      const items = getItems()
      const availableHeight = window.innerHeight - CONTENT_MARGIN * 2
      const itemsHeight = viewport.scrollHeight

      const contentStyles = window.getComputedStyle(content)
      const contentBorderTopWidth = Number.parseInt(
        contentStyles.borderTopWidth,
        10,
      )
      const contentPaddingTop = Number.parseInt(
        contentStyles.paddingTop,
        10,
      )
      const contentBorderBottomWidth = Number.parseInt(
        contentStyles.borderBottomWidth,
        10,
      )
      const contentPaddingBottom = Number.parseInt(
        contentStyles.paddingBottom,
        10,
      )
      const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth; // prettier-ignore
      const minContentHeight = Math.min(
        selectedItem.offsetHeight * 5,
        fullContentHeight,
      )

      const viewportStyles = window.getComputedStyle(viewport)
      const viewportPaddingTop = Number.parseInt(
        viewportStyles.paddingTop,
        10,
      )
      const viewportPaddingBottom = Number.parseInt(
        viewportStyles.paddingBottom,
        10,
      )

      const topEdgeToTriggerMiddle =
        triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN
      const triggerMiddleToBottomEdge =
        availableHeight - topEdgeToTriggerMiddle

      const selectedItemHalfHeight = selectedItem.offsetHeight / 2
      const itemOffsetMiddle =
        selectedItem.offsetTop + selectedItemHalfHeight
      const contentTopToItemMiddle =
        contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle
      const itemMiddleToContentBottom =
        fullContentHeight - contentTopToItemMiddle

      const willAlignWithoutTopOverflow =
        contentTopToItemMiddle <= topEdgeToTriggerMiddle

      if (willAlignWithoutTopOverflow) {
        const isLastItem =
          items.length > 0 &&
          selectedItem === items[items.length - 1]!.ref.current
        contentWrapper.style.bottom = `${0}px`
        const viewportOffsetBottom =
          content.clientHeight -
          viewport.offsetTop -
          viewport.offsetHeight
        const clampedTriggerMiddleToBottomEdge = Math.max(
          triggerMiddleToBottomEdge,
          selectedItemHalfHeight +
            // viewport might have padding bottom, include it to avoid a scrollable viewport
            (isLastItem ? viewportPaddingBottom : 0) +
            viewportOffsetBottom +
            contentBorderBottomWidth,
        )
        const height =
          contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge
        contentWrapper.style.height = `${height}px`
      } else {
        const isFirstItem =
          items.length > 0 && selectedItem === items[0]!.ref.current
        contentWrapper.style.top = `${0}px`
        const clampedTopEdgeToTriggerMiddle = Math.max(
          topEdgeToTriggerMiddle,
          contentBorderTopWidth +
            viewport.offsetTop +
            // viewport might have padding top, include it to avoid a scrollable viewport
            (isFirstItem ? viewportPaddingTop : 0) +
            selectedItemHalfHeight,
        )
        const height =
          clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom
        contentWrapper.style.height = `${height}px`
        viewport.scrollTop =
          contentTopToItemMiddle -
          topEdgeToTriggerMiddle +
          viewport.offsetTop
      }

      contentWrapper.style.margin = `${CONTENT_MARGIN}px 0`
      contentWrapper.style.minHeight = `${minContentHeight}px`
      contentWrapper.style.maxHeight = `${availableHeight}px`
      // -----------------------------------------------------------------------------------------

      onPlaced?.()

      // we don't want the initial scroll position adjustment to trigger "expand on scroll"
      // so we explicitly turn it on only after they've registered.
      requestAnimationFrame(
        () => (shouldExpandOnScrollRef.current = true),
      )
    }
  }, [
    getItems,
    context.trigger,
    context.valueNode,
    contentWrapper,
    content,
    viewport,
    selectedItem,
    selectedItemText,
    context.dir,
    onPlaced,
  ])

  useLayoutEffect(() => position(), [position])

  // copy z-index from content to wrapper
  const [contentZIndex, setContentZIndex] = useState<string>()
  useLayoutEffect(() => {
    if (content)
      setContentZIndex(window.getComputedStyle(content).zIndex)
  }, [content])

  // When the viewport becomes scrollable at the top, the scroll up button will mount.
  // Because it is part of the normal flow, it will push down the viewport, thus throwing our
  // trigger => selectedItem alignment off by the amount the viewport was pushed down.
  // We wait for this to happen and then re-run the positining logic one more time to account for it.
  const handleScrollButtonChange = useCallback(
    (node: MultiSelectScrollButtonImplElement | null) => {
      if (node && shouldRepositionRef.current === true) {
        position()
        focusSelectedItem?.()
        shouldRepositionRef.current = false
      }
    },
    [position, focusSelectedItem],
  )

  return (
    <MultiSelectViewportProvider
      contentWrapper={contentWrapper}
      onScrollButtonChange={handleScrollButtonChange}
      scope={__scopeMultiSelect}
      shouldExpandOnScrollRef={shouldExpandOnScrollRef}
    >
      <div
        ref={setContentWrapper}
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          zIndex: contentZIndex,
        }}
      >
        <Primitive.div
          {...popperProps}
          ref={composedRefs}
          style={{
            // When we get the height of the content, it includes borders. If we were to set
            // the height without having `boxSizing: 'border-box'` it would be too big.
            boxSizing: 'border-box',
            // We need to ensure the content doesn't get taller than the wrapper
            maxHeight: '100%',
            ...popperProps.style,
          }}
        />
      </div>
    </MultiSelectViewportProvider>
  )
}

MultiSelectItemAlignedPosition.displayName =
  ITEM_ALIGNED_POSITION_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectContentImpl
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectContentImplElement =
  | MultiSelectItemAlignedPositionElement
  | MultiSelectPopperPositionElement
type DismissableLayerProps = React.ComponentPropsWithoutRef<
  typeof DismissableLayer
>
type FocusScopeProps = React.ComponentPropsWithoutRef<
  typeof FocusScope
>

interface MultiSelectPopperPrivateProps {
  onPlaced?: PopperContentProps['onPlaced']
}

interface MultiSelectContentImplProps
  extends Omit<
      MultiSelectPopperPositionProps,
      keyof MultiSelectPopperPrivateProps
    >,
    Omit<
      MultiSelectItemAlignedPositionProps,
      keyof MultiSelectPopperPrivateProps
    > {
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  onCloseAutoFocus?: FocusScopeProps['onUnmountAutoFocus']
  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  onEscapeKeyDown?: DismissableLayerProps['onEscapeKeyDown']
  /**
   * Event handler called when the a `pointerdown` event happens outside of the `DismissableLayer`.
   * Can be prevented.
   */
  onPointerDownOutside?: DismissableLayerProps['onPointerDownOutside']

  position?: 'item-aligned' | 'popper'

  ref?: React.Ref<MultiSelectContentImplElement | null>
}

const Slot = createSlot('MultiSelectContent.RemoveScroll')

const MultiSelectContentImpl = ({
  ref,
  __scopeMultiSelect,
  position = 'item-aligned',
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  //
  // PopperContent props
  side,
  sideOffset,
  align,
  alignOffset,
  arrowPadding,
  collisionBoundary,
  collisionPadding,
  sticky,
  hideWhenDetached,
  avoidCollisions,
  onKeyDown,
  style,
  ...props
}: ScopedProps<MultiSelectContentImplProps>): React.JSX.Element => {
  const context = useMultiSelectContext(
    CONTENT_NAME,
    __scopeMultiSelect,
  )
  const [content, setContent] =
    useState<MultiSelectContentImplElement | null>(null)
  const [viewport, setViewport] =
    useState<MultiSelectViewportElement | null>(null)
  const composedRefs = useComposedRefs(ref, setContent)
  const [selectedItem, setSelectedItem] =
    useState<MultiSelectItemElement | null>(null)
  const [selectedItemText, setSelectedItemText] =
    useState<MultiSelectItemTextElement | null>(null)
  const getItems = useCollection(__scopeMultiSelect)
  const [isPositioned, setIsPositioned] = useState(false)
  const lastSelectedItemFoundRef = useRef(false)
  const firstValidItemFoundRef = useRef(false)

  // aria-hide everything except the content (better supported equivalent to setting aria-modal)
  useEffect(() => {
    if (content) return hideOthers(content)
  }, [content])

  // Make sure the whole tree has focus guards as our `Select` may be
  // the last element in the DOM (because of the `Portal`)
  useFocusGuards()

  const focusFirst = useCallback(
    (candidates: Array<HTMLElement | null>) => {
      const [firstItem, ...restItems] = getItems().map(
        (item) => item.ref.current,
      )
      const [lastItem] = restItems.slice(-1)

      const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement
      for (const candidate of candidates) {
        // if focus is already where we want to go, we don't want to keep going through the candidates
        if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return
        candidate?.scrollIntoView({ block: 'nearest' })
        // viewport might have padding so scroll to its edges when focusing first/last items.
        if (candidate === firstItem && viewport)
          viewport.scrollTop = 0
        if (candidate === lastItem && viewport)
          viewport.scrollTop = viewport.scrollHeight
        candidate?.focus()

        if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) {
          return
        }
      }
    },
    [getItems, viewport],
  )

  const focusSelectedItem = useCallbackRef(() =>
    focusFirst([selectedItem, content]),
  )

  useEffect(() => {
    if (isPositioned) {
      focusSelectedItem()
    }
  }, [isPositioned, focusSelectedItem])

  // prevent selecting items on `pointerup` in some cases after opening from `pointerdown`
  // and close on `pointerup` outside.
  const { onOpenChange, triggerPointerDownPosRef } = context
  useEffect(() => {
    if (content) {
      let pointerMoveDelta = { x: 0, y: 0 }

      const handlePointerMove = (event: PointerEvent): void => {
        pointerMoveDelta = {
          x: Math.abs(
            Math.round(event.pageX) -
              (triggerPointerDownPosRef.current?.x ?? 0),
          ),
          y: Math.abs(
            Math.round(event.pageY) -
              (triggerPointerDownPosRef.current?.y ?? 0),
          ),
        }
      }
      const handlePointerUp = (event: PointerEvent): void => {
        // If the pointer hasn't moved by a certain threshold then we prevent selecting item on `pointerup`.
        if (pointerMoveDelta.x <= 10 && pointerMoveDelta.y <= 10) {
          event.preventDefault()
        } else {
          // otherwise, if the event was outside the content, close.
          if (!content.contains(event.target as HTMLElement)) {
            onOpenChange(false)
          }
        }
        document.removeEventListener('pointermove', handlePointerMove)
        triggerPointerDownPosRef.current = null
      }

      if (triggerPointerDownPosRef.current !== null) {
        document.addEventListener('pointermove', handlePointerMove)
        document.addEventListener('pointerup', handlePointerUp, {
          capture: true,
          once: true,
        })
      }

      return () => {
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp, {
          capture: true,
        })
      }
    }
  }, [content, onOpenChange, triggerPointerDownPosRef])

  useEffect(() => {
    const close = (): void => onOpenChange(false)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
    }
  }, [onOpenChange])

  const itemRefCallback = useCallback(
    (
      node: MultiSelectItemElement | null,
      value: string,
      disabled: boolean,
    ) => {
      const isFirstValidItem =
        !firstValidItemFoundRef.current &&
        !disabled &&
        !(context.hideSelectedOptions && value in context.valueMap)
      const isLastSelectedItem =
        context.value[context.value.length - 1] === value &&
        !lastSelectedItemFoundRef.current &&
        !context.hideSelectedOptions
      if (isLastSelectedItem || isFirstValidItem) {
        setSelectedItem(node)
        if (isFirstValidItem) firstValidItemFoundRef.current = true
        if (isLastSelectedItem)
          lastSelectedItemFoundRef.current = true
      }
    },
    [context.value, context.valueMap, context.hideSelectedOptions],
  )
  const handleItemLeave = useCallback(
    () => content?.focus(),
    [content],
  )
  const itemTextRefCallback = useCallback(
    (
      node: MultiSelectItemTextElement | null,
      value: string,
      disabled: boolean,
    ) => {
      const isFirstValidItem =
        !firstValidItemFoundRef.current &&
        !disabled &&
        !(context.hideSelectedOptions && value in context.valueMap)
      const isLastSelectedItem =
        context.value[context.value.length - 1] === value &&
        !lastSelectedItemFoundRef.current &&
        !context.hideSelectedOptions
      if (isLastSelectedItem || isFirstValidItem) {
        setSelectedItemText(node)
      }
    },
    [context.value, context.valueMap, context.hideSelectedOptions],
  )

  const MultiSelectPosition =
    position === 'popper'
      ? MultiSelectPopperPosition
      : MultiSelectItemAlignedPosition

  // Silently ignore props that are not supported by `SelectItemAlignedPosition`
  const popperContentProps =
    MultiSelectPosition === MultiSelectPopperPosition
      ? {
          side,
          sideOffset,
          align,
          alignOffset,
          arrowPadding,
          collisionBoundary,
          collisionPadding,
          sticky,
          hideWhenDetached,
          avoidCollisions,
        }
      : {}

  return (
    <MultiSelectContentProvider
      itemRefCallback={itemRefCallback}
      itemTextRefCallback={itemTextRefCallback}
      selectedItem={selectedItem}
      selectedItemText={selectedItemText}
      content={content}
      focusSelectedItem={focusSelectedItem}
      isPositioned={isPositioned}
      onItemLeave={handleItemLeave}
      onViewportChange={setViewport}
      position={position}
      scope={__scopeMultiSelect}
      viewport={viewport}
    >
      <RemoveScroll as={Slot} allowPinchZoom>
        <FocusScope
          // we make sure we're not trapping once it's been closed
          // (closed !== unmounted when animating out)
          trapped={context.open}
          onMountAutoFocus={(event: Event) => {
            // we prevent open autofocus because we manually focus the selected item
            event.preventDefault()
          }}
          onUnmountAutoFocus={composeEventHandlers(
            onCloseAutoFocus,
            (event: Event) => {
              context.trigger?.focus({ preventScroll: true })
              event.preventDefault()
            },
          )}
          asChild
        >
          <DismissableLayer
            disableOutsidePointerEvents
            onDismiss={() => context.onOpenChange(false)}
            onEscapeKeyDown={onEscapeKeyDown}
            // When focus is trapped, a focusout event may still happen.
            // We make sure we don't trigger our `onDismiss` in such case.
            onFocusOutside={(event) => event.preventDefault()}
            onPointerDownOutside={onPointerDownOutside}
            asChild
          >
            <MultiSelectPosition
              ref={composedRefs}
              style={{
                display: 'flex',
                flexDirection: 'column',
                outline: 'none',
                ...style,
              }}
              data-state={context.open ? 'open' : 'closed'}
              dir={context.dir}
              id={context.contentId}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={composeEventHandlers(onKeyDown, (event) => {
                if (event.key === 'Tab') event.preventDefault()

                if (
                  ['ArrowDown', 'ArrowUp', 'End', 'Home'].includes(
                    event.key,
                  )
                ) {
                  const items = getItems().filter(
                    (item) => !item.disabled,
                  )
                  let candidateNodes = items.map(
                    (item) => item.ref.current!,
                  )

                  if (['ArrowUp', 'End'].includes(event.key)) {
                    candidateNodes = [...candidateNodes]
                    candidateNodes.reverse()
                  }

                  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                    const currentElement =
                      event.target as MultiSelectItemElement
                    const currentIndex =
                      candidateNodes.indexOf(currentElement)

                    candidateNodes = candidateNodes.slice(
                      currentIndex + 1,
                    )
                  }

                  setTimeout(() => focusFirst(candidateNodes))
                  event.preventDefault()
                }
              })}
              onPlaced={() => setIsPositioned(true)}
              role='listbox'
              {...props}
              {...popperContentProps}
            />
          </DismissableLayer>
        </FocusScope>
      </RemoveScroll>
    </MultiSelectContentProvider>
  )
}

MultiSelectContentImpl.displayName = CONTENT_IMPL_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectContent
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectContentElement = MultiSelectContentImplElement
interface MultiSelectContentProps
  extends MultiSelectContentImplProps {}

const MultiSelectContent = ({
  __scopeMultiSelect,
  ...props
}: ScopedProps<MultiSelectContentProps>): React.JSX.Element | null => {
  const context = useMultiSelectContext(
    CONTENT_NAME,
    __scopeMultiSelect,
  )
  const [fragment, setFragment] = useState<DocumentFragment>()

  // setting the fragment in `useLayoutEffect` as `DocumentFragment` doesn't exist on the server
  useLayoutEffect(() => {
    setFragment(new DocumentFragment())
  }, [])

  if (!context.open) {
    const frag = fragment as Element | undefined
    return frag
      ? ReactDOM.createPortal(
          <MultiSelectContentProvider scope={__scopeMultiSelect}>
            <CollectionSlot scope={__scopeMultiSelect}>
              <div>{props.children}</div>
            </CollectionSlot>
          </MultiSelectContentProvider>,
          frag,
        )
      : null
  }

  return (
    <MultiSelectContentImpl
      __scopeMultiSelect={__scopeMultiSelect}
      {...props}
    />
  )
}

MultiSelectContent.displayName = CONTENT_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectGroup
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectGroupProps
  extends React.ComponentProps<typeof Primitive.div> {}

const MultiSelectGroup = ({
  __scopeMultiSelect,
  ...props
}: ScopedProps<MultiSelectGroupProps>): React.JSX.Element => {
  const groupId = useId()
  return (
    <MultiSelectGroupContextProvider
      id={groupId}
      scope={__scopeMultiSelect}
    >
      <Primitive.div
        aria-labelledby={groupId}
        role='group'
        {...props}
      />
    </MultiSelectGroupContextProvider>
  )
}

MultiSelectGroup.displayName = GROUP_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectLabel
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectLabelProps
  extends React.ComponentProps<typeof Primitive.div> {}

const MultiSelectLabel = ({
  __scopeMultiSelect,
  ...props
}: ScopedProps<MultiSelectLabelProps>): React.JSX.Element => {
  const groupContext = useMultiSelectGroupContext(
    LABEL_NAME,
    __scopeMultiSelect,
  )
  return <Primitive.div id={groupContext.id} {...props} />
}

MultiSelectLabel.displayName = LABEL_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectItem
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectItemElement = React.ComponentRef<typeof Primitive.div>
interface MultiSelectItemProps
  extends React.ComponentProps<typeof Primitive.div> {
  disabled?: boolean
  textValue?: string
  value: string
}

const MultiSelectItem = ({
  __scopeMultiSelect,
  value,
  disabled = false,
  textValue: textValueProp,
  ref: forwardedRef,
  onBlur,
  onPointerDown,
  onPointerLeave,
  onClick,
  onFocus,
  onKeyDown,
  onPointerMove,
  onPointerUp,
  ...props
}: ScopedProps<MultiSelectItemProps>): React.JSX.Element => {
  const context = useMultiSelectContext(ITEM_NAME, __scopeMultiSelect)
  const contentContext = useMultiSelectContentContext(
    ITEM_NAME,
    __scopeMultiSelect,
  )
  const isSelected = value in context.valueMap
  const [textValue, setTextValue] = useState(textValueProp ?? '')
  const [isFocused, setIsFocused] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const onItemNodeChange = useCallbackRef(
    (node: HTMLDivElement | null) =>
      contentContext.itemRefCallback?.(node, value, disabled),
  )
  const composedRefs = useComposedRefs(
    rootRef,
    forwardedRef,
    onItemNodeChange,
  )
  const textId = useId()
  const pointerTypeRef =
    useRef<React.PointerEvent['pointerType']>('touch')

  const handleSelect = (): void => {
    if (!disabled) {
      context.onValueChange((curr) => {
        if (curr.includes(value)) {
          return curr.filter((selected) => selected !== value)
        }

        if (curr.length < context.maxValues) {
          return [...curr, value]
        }

        return curr
      })
    }
  }

  if (value === '') {
    throw new Error(
      'A <MultiSelect.Item /> must have a value prop that is not an empty string.',
    )
  }

  return (
    <MultiSelectItemContextProvider
      disabled={disabled}
      isSelected={isSelected}
      textId={textId}
      value={value}
      onItemTextChange={useCallback((node) => {
        setTextValue(
          (prevTextValue) =>
            prevTextValue || (node?.textContent ?? '').trim(),
        )
      }, [])}
      rootRef={rootRef}
      scope={__scopeMultiSelect}
    >
      <CollectionItemSlot
        disabled={disabled}
        textValue={textValue}
        value={value}
        scope={__scopeMultiSelect}
      >
        <Primitive.div
          ref={composedRefs}
          aria-disabled={disabled || undefined}
          aria-hidden={context.hideSelectedOptions && isSelected}
          aria-labelledby={textId}
          // `isFocused` caveat fixes stuttering in VoiceOver
          aria-selected={isSelected && isFocused}
          data-disabled={disabled ? '' : undefined}
          data-highlighted={isFocused ? '' : undefined}
          data-state={isSelected ? 'checked' : 'unchecked'}
          hidden={context.hideSelectedOptions && isSelected}
          tabIndex={disabled ? undefined : -1}
          onBlur={composeEventHandlers(onBlur, () =>
            setIsFocused(false),
          )}
          onClick={composeEventHandlers(onClick, () => {
            // Open on click when using a touch or pen device
            if (pointerTypeRef.current !== 'mouse') handleSelect()
          })}
          onFocus={composeEventHandlers(onFocus, () =>
            setIsFocused(true),
          )}
          onKeyDown={composeEventHandlers(onKeyDown, (event) => {
            if (SELECTION_KEYS.includes(event.key)) handleSelect()
            // prevent page scroll if using the space key to select an item
            if (event.key === ' ') event.preventDefault()
          })}
          onPointerDown={composeEventHandlers(
            onPointerDown,
            (event) => {
              pointerTypeRef.current = event.pointerType
            },
          )}
          onPointerLeave={composeEventHandlers(
            onPointerLeave,
            (event) => {
              if (event.currentTarget === document.activeElement) {
                contentContext.onItemLeave?.()
              }
            },
          )}
          onPointerMove={composeEventHandlers(
            onPointerMove,
            (event) => {
              // Remember pointer type when sliding over to this item from another one
              pointerTypeRef.current = event.pointerType
              if (disabled) {
                contentContext.onItemLeave?.()
              } else if (
                pointerTypeRef.current === 'mouse' &&
                event.currentTarget.contains(event.target as Node)
              ) {
                // even though safari doesn't support this option, it's acceptable
                // as it only means it might scroll a few pixels when using the pointer.
                event.currentTarget.focus({ preventScroll: true })
              }
            },
          )}
          onPointerUp={composeEventHandlers(onPointerUp, (event) => {
            // Using a mouse you should be able to do pointer down, move through
            // the list, and release the pointer over the item to select it.
            // Also this element should be parent of the target or be the target of event to prevent unexpected behaviour
            if (
              pointerTypeRef.current === 'mouse' &&
              event.currentTarget.contains(event.target as Node)
            )
              handleSelect()
          })}
          role='option'
          {...props}
        />
      </CollectionItemSlot>
    </MultiSelectItemContextProvider>
  )
}

MultiSelectItem.displayName = ITEM_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectItemText
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectItemTextElement = React.ComponentRef<
  typeof Primitive.span
>
interface MultiSelectItemTextProps
  extends React.ComponentProps<typeof Primitive.span> {}

const MultiSelectItemText = ({
  __scopeMultiSelect,
  // We ignore `className` and `style` as this part shouldn't be styled.
  className,
  style,
  ref,
  children,
  ...props
}: ScopedProps<MultiSelectItemTextProps>): React.JSX.Element => {
  const contentContext = useMultiSelectContentContext(
    ITEM_TEXT_NAME,
    __scopeMultiSelect,
  )
  const itemContext = useMultiSelectItemContext(
    ITEM_TEXT_NAME,
    __scopeMultiSelect,
  )
  const onItemTextNodeChange = useCallbackRef(
    (node: MultiSelectItemTextElement | null) =>
      contentContext.itemTextRefCallback?.(
        node,
        itemContext.value,
        itemContext.disabled,
      ),
  )

  const composedRefs = useComposedRefs(
    ref,
    itemContext.onItemTextChange,
    onItemTextNodeChange,
  )

  return (
    <Primitive.span
      ref={composedRefs}
      id={itemContext.textId}
      {...props}
    >
      {children}
    </Primitive.span>
  )
}

MultiSelectItemText.displayName = ITEM_TEXT_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectItemIndicator
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectItemIndicatorProps
  extends React.ComponentProps<typeof Primitive.span> {}

const MultiSelectItemIndicator = ({
  __scopeMultiSelect,
  ...props
}: ScopedProps<MultiSelectItemIndicatorProps>): React.JSX.Element | null => {
  const itemContext = useMultiSelectItemContext(
    ITEM_INDICATOR_NAME,
    __scopeMultiSelect,
  )
  return itemContext.isSelected ? (
    <Primitive.span aria-hidden {...props} />
  ) : null
}

MultiSelectItemIndicator.displayName = ITEM_INDICATOR_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectScrollUpButton
 * -----------------------------------------------------------------------------------------------*/

type MultiSelectScrollButtonImplElement = React.ComponentRef<
  typeof Primitive.div
>
interface MultiSelectScrollButtonImplProps
  extends React.ComponentProps<typeof Primitive.div> {
  onAutoScroll: () => void
}

const MultiSelectScrollButtonImpl = ({
  __scopeMultiSelect,
  onAutoScroll,
  style,
  onPointerDown,
  onPointerLeave,
  onPointerMove,
  ...props
}: ScopedProps<MultiSelectScrollButtonImplProps>): React.JSX.Element | null => {
  const contentContext = useMultiSelectContentContext(
    'MultiSelectScrollButton',
    __scopeMultiSelect,
  )
  const autoScrollTimerRef = useRef<number | null>(null)
  const getItems = useCollection(__scopeMultiSelect)

  const clearAutoScrollTimer = useCallback(() => {
    if (autoScrollTimerRef.current !== null) {
      window.clearInterval(autoScrollTimerRef.current)
      autoScrollTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearAutoScrollTimer()
  }, [clearAutoScrollTimer])

  // When the viewport becomes scrollable on either side, the relevant scroll button will mount.
  // Because it is part of the normal flow, it will push down (top button) or shrink (bottom button)
  // the viewport, potentially causing the active item to now be partially out of view.
  // We re-run the `scrollIntoView` logic to make sure it stays within the viewport.
  useLayoutEffect(() => {
    const activeItem = getItems().find(
      (item) => item.ref.current === document.activeElement,
    )
    activeItem?.ref.current?.scrollIntoView({ block: 'nearest' })
  }, [getItems])

  return (
    <Primitive.div
      aria-hidden
      {...props}
      style={{ flexShrink: 0, ...style }}
      onPointerDown={composeEventHandlers(onPointerDown, () => {
        if (autoScrollTimerRef.current === null) {
          autoScrollTimerRef.current = window.setInterval(
            onAutoScroll,
            50,
          )
        }
      })}
      onPointerLeave={composeEventHandlers(onPointerLeave, () => {
        clearAutoScrollTimer()
      })}
      onPointerMove={composeEventHandlers(onPointerMove, () => {
        contentContext.onItemLeave?.()
        if (autoScrollTimerRef.current === null) {
          autoScrollTimerRef.current = window.setInterval(
            onAutoScroll,
            50,
          )
        }
      })}
    />
  )
}

interface MultiSelectScrollUpButtonProps
  extends Omit<MultiSelectScrollButtonImplProps, 'onAutoScroll'> {}

const MultiSelectScrollUpButton = ({
  __scopeMultiSelect,
  ref,
  ...props
}: ScopedProps<MultiSelectScrollUpButtonProps>): React.JSX.Element | null => {
  const contentContext = useMultiSelectContentContext(
    SCROLL_UP_BUTTON_NAME,
    __scopeMultiSelect,
  )
  const viewportContext = useMultiSelectViewportContext(
    SCROLL_UP_BUTTON_NAME,
    __scopeMultiSelect,
  )
  const [canScrollUp, setCanScrollUp] = useState(false)
  const composedRefs = useComposedRefs(
    ref,
    viewportContext.onScrollButtonChange,
  )

  useLayoutEffect(() => {
    if (contentContext.viewport && contentContext.isPositioned) {
      const viewport = contentContext.viewport
      function handleScroll(): void {
        const canScrollUp = viewport.scrollTop > 0
        setCanScrollUp(canScrollUp)
      }
      handleScroll()
      viewport.addEventListener('scroll', handleScroll)
      return () =>
        viewport.removeEventListener('scroll', handleScroll)
    }
  }, [contentContext.viewport, contentContext.isPositioned])

  return canScrollUp ? (
    <MultiSelectScrollButtonImpl
      {...props}
      ref={composedRefs}
      onAutoScroll={() => {
        const { viewport, selectedItem } = contentContext
        if (viewport && selectedItem) {
          viewport.scrollTop =
            viewport.scrollTop - selectedItem.offsetHeight
        }
      }}
    />
  ) : null
}

MultiSelectScrollUpButton.displayName = SCROLL_UP_BUTTON_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectScrollDownButton
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectScrollDownButtonProps
  extends Omit<MultiSelectScrollButtonImplProps, 'onAutoScroll'> {}

const MultiSelectScrollDownButton = ({
  __scopeMultiSelect,
  ref,
  ...props
}: ScopedProps<MultiSelectScrollDownButtonProps>): React.JSX.Element | null => {
  const contentContext = useMultiSelectContentContext(
    SCROLL_DOWN_BUTTON_NAME,
    __scopeMultiSelect,
  )
  const viewportContext = useMultiSelectViewportContext(
    SCROLL_DOWN_BUTTON_NAME,
    __scopeMultiSelect,
  )
  const [canScrollDown, setCanScrollDown] = useState(false)
  const composedRefs = useComposedRefs(
    ref,
    viewportContext.onScrollButtonChange,
  )

  useLayoutEffect(() => {
    if (contentContext.viewport && contentContext.isPositioned) {
      const viewport = contentContext.viewport
      const handleScroll = (): void => {
        const maxScroll =
          viewport.scrollHeight - viewport.clientHeight
        // we use Math.ceil here because if the UI is zoomed-in
        // `scrollTop` is not always reported as an integer
        const canScrollDown =
          Math.ceil(viewport.scrollTop) < maxScroll
        setCanScrollDown(canScrollDown)
      }
      handleScroll()
      viewport.addEventListener('scroll', handleScroll)
      return () =>
        viewport.removeEventListener('scroll', handleScroll)
    }
  }, [contentContext.viewport, contentContext.isPositioned])

  return canScrollDown ? (
    <MultiSelectScrollButtonImpl
      ref={composedRefs}
      onAutoScroll={() => {
        const { viewport, selectedItem } = contentContext
        if (viewport && selectedItem) {
          viewport.scrollTop =
            viewport.scrollTop + selectedItem.offsetHeight
        }
      }}
      {...props}
    />
  ) : null
}

MultiSelectScrollDownButton.displayName = SCROLL_DOWN_BUTTON_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectSeparator
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectSeparatorProps
  extends React.ComponentProps<typeof Primitive.div> {}

const MultiSelectSeparator = (
  props: MultiSelectSeparatorProps,
): React.JSX.Element => <Primitive.div aria-hidden {...props} />

MultiSelectSeparator.displayName = SEPARATOR_NAME

/* -------------------------------------------------------------------------------------------------
 * SelectArrow
 * -----------------------------------------------------------------------------------------------*/

interface MultiSelectArrowProps
  extends React.ComponentProps<typeof PopperPrimitive.Arrow> {}

const MultiSelectArrow = ({
  __scopeMultiSelect,
  ...props
}: ScopedProps<MultiSelectArrowProps>): React.JSX.Element | null => {
  const popperScope = usePopperScope(__scopeMultiSelect)
  const context = useMultiSelectContext(
    ARROW_NAME,
    __scopeMultiSelect,
  )
  const contentContext = useMultiSelectContentContext(
    ARROW_NAME,
    __scopeMultiSelect,
  )
  return context.open && contentContext.position === 'popper' ? (
    <PopperPrimitive.Arrow {...popperScope} {...props} />
  ) : null
}

MultiSelectArrow.displayName = ARROW_NAME

/* -------------------------------------------------------------------------------------------------
 * MultiSelectItemValuePortal
 * -----------------------------------------------------------------------------------------------*/

const ITEM_VALUE_PORTAL_NAME = 'MultiSelectItemValuePortal'

interface MultiSelectItemSelectedContentProps
  extends React.ComponentProps<typeof Primitive.div> {}

const MultiSelectItemValuePortal = ({
  __scopeMultiSelect,
  style,
  onPointerMove,
  onPointerUp,
  ...props
}: ScopedProps<MultiSelectItemSelectedContentProps>): React.JSX.Element | null => {
  const context = useMultiSelectContext(
    ITEM_VALUE_PORTAL_NAME,
    __scopeMultiSelect,
  )
  const itemContext = useMultiSelectItemContext(
    ITEM_VALUE_PORTAL_NAME,
    __scopeMultiSelect,
  )

  return itemContext.isSelected &&
    context.valueNode &&
    !context.valueNodeHasChildren
    ? ReactDOM.createPortal(
        <Primitive.div
          style={{
            order: context.valueMap[itemContext.value],
            pointerEvents: context.open ? 'auto' : undefined,
            ...style,
          }}
          aria-disabled={itemContext.disabled || undefined}
          data-disabled={itemContext.disabled ? '' : undefined}
          onPointerMove={composeEventHandlers(onPointerMove, () => {
            itemContext.rootRef.current?.focus({
              preventScroll: true,
            })
          })}
          {...props}
        />,
        context.valueNode,
      )
    : null
}

/* -------------------------------------------------------------------------------------------------
 * MultiSelectDeselectButton
 * -----------------------------------------------------------------------------------------------*/

const DESELECT_BUTTON_NAME = 'MultiSelectDeselectButton'

interface MultiSelectDeselectButtonProps
  extends React.ComponentProps<typeof Primitive.button> {}

const MultiSelectDeselectButton = ({
  __scopeMultiSelect,
  onClick,
  disabled,
  ...props
}: ScopedProps<MultiSelectDeselectButtonProps>): React.JSX.Element | null => {
  const context = useMultiSelectContext(
    DESELECT_BUTTON_NAME,
    __scopeMultiSelect,
  )
  const itemContext = useMultiSelectItemContext(
    DESELECT_BUTTON_NAME,
    __scopeMultiSelect,
  )
  const isDisabled =
    itemContext.disabled || disabled || context.disabled

  const onClickDeselect: MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    event.stopPropagation()
    context.onValueChange((curr) =>
      curr.filter((value) => value !== itemContext.value),
    )
  }

  return (
    <Primitive.button
      disabled={isDisabled}
      style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}
      onClick={composeEventHandlers(onClick, onClickDeselect)}
      {...props}
    />
  )
}

/* -----------------------------------------------------------------------------------------------*/

function shouldShowPlaceholder(value?: string[]): boolean {
  return value === undefined || value.length === 0
}

const Root = MultiSelect
const Trigger = MultiSelectTrigger
const Value = MultiSelectValue
const Icon = MultiSelectIcon
const Portal = MultiSelectPortal
const Content = MultiSelectContent
const Viewport = MultiSelectViewport
const Group = MultiSelectGroup
const Label = MultiSelectLabel
const Item = MultiSelectItem
const ItemText = MultiSelectItemText
const ItemValuePortal = MultiSelectItemValuePortal
const DeselectButton = MultiSelectDeselectButton
const ItemIndicator = MultiSelectItemIndicator
const ScrollUpButton = MultiSelectScrollUpButton
const ScrollDownButton = MultiSelectScrollDownButton
const Separator = MultiSelectSeparator
const Arrow = MultiSelectArrow

export {
  Arrow,
  Content,
  createMultiSelectScope,
  DeselectButton,
  Group,
  Icon,
  Item,
  ItemIndicator,
  ItemText,
  ItemValuePortal,
  Label,
  MultiSelect,
  MultiSelectArrow,
  MultiSelectContent,
  MultiSelectDeselectButton,
  MultiSelectGroup,
  MultiSelectIcon,
  MultiSelectItem,
  MultiSelectItemIndicator,
  MultiSelectItemText,
  MultiSelectItemValuePortal,
  MultiSelectLabel,
  MultiSelectPortal,
  MultiSelectScrollDownButton,
  MultiSelectScrollUpButton,
  MultiSelectSeparator,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectViewport,
  Portal,
  Root,
  ScrollDownButton,
  ScrollUpButton,
  Separator,
  Trigger,
  Value,
  Viewport,
}
export type {
  MultiSelectArrowProps,
  MultiSelectContentProps,
  MultiSelectGroupProps,
  MultiSelectIconProps,
  MultiSelectItemIndicatorProps,
  MultiSelectItemProps,
  MultiSelectItemTextProps,
  MultiSelectLabelProps,
  MultiSelectPortalProps,
  MultiSelectProps,
  MultiSelectScrollDownButtonProps,
  MultiSelectScrollUpButtonProps,
  MultiSelectSeparatorProps,
  MultiSelectTriggerProps,
  MultiSelectValueProps,
  MultiSelectViewportProps,
}
