import { derived, writable } from "svelte/store";
import { reflectAriaActivedescendent } from "./internal/aria-activedescendent";
import { reflectAriaControls, type Controllable } from './internal/aria-controls';
import { reflectAriaDisabled } from "./internal/aria-disabled";
import { defaultExpanded, focusOnClose, focusOnExpanded, reflectAriaExpanded, type Expandable } from "./internal/aria-expanded";
import { reflectAriaLabel, type Labelable } from "./internal/aria-label";
import { defaultSelected, type Selectable } from "./internal/aria-selected";
import { applyBehaviors } from "./internal/behavior";
import { keyCharacter } from "./internal/key-character";
import { keyEscape } from "./internal/key-escape";
import { keyFirstLast } from "./internal/key-first-last";
import { keyPreviousNext } from "./internal/key-previous-next";
import { keySpaceEnter } from "./internal/key-space-enter";
import { keyTab } from "./internal/key-tab";
import { defaultList, firstActive, getItemValues, lastActive, nextActive, previousActive, removeOnDestroy, type ItemOptions, type List } from "./internal/list";
import { ensureID } from "./internal/new-id";
import { noop } from "./internal/noop";
import { onClick } from "./internal/on-click";
import { onClickOutside } from "./internal/on-click-outside";
import { onKeydown } from "./internal/on-keydown";
import { onPointerMoveChild, onPointerOut } from "./internal/on-pointer-move";
import { setHasPopup } from "./internal/set-has-popup";
import { setRole } from "./internal/set-role";
import { setTabIndex } from "./internal/set-tab-index";
import { setType } from "./internal/set-type";

// TODO: add "value" selector, to pick text value off list item objects
export interface Menu extends Labelable, Expandable, Controllable, List, Selectable {
  button?: string
  menu?: string
}

export function createMenu(init?: Partial<Menu>) {
  // prefix for generating unique IDs
  const prefix = 'headlessui-menu'

  // internal state for component
  let state: Menu = {
    ...defaultList,
    ...defaultExpanded,
    ...defaultSelected,
    ...init,
  }

  // wrap with store for reactivity
  const store = writable(state)

  // update state and notify store of changes for reactivity
  const set = (part: Partial<Menu>) => store.set(state = { ...state, ...part })

  // return selected value (based on active state)
  const value = () => state.active === -1 || state.items.length === 0 ? undefined : state.items[state.active].value

  // open the menu and set first item active
  const open = () => set({ expanded: true })

  // close the menu
  const close = () => set({ expanded: false, active: -1 })

  // toggle open / closed state
  const toggle = () => state.expanded ? close() : open()

  // set focused (active) item (open if not expanded) only if changed
  const focus = (active: number) => state.active !== active && set({ expanded: state.expanded || active > -1, active })

  // set focus (active) to first
  const first = () => focus(firstActive(state))

  // set focus (active) to previous
  const previous = () => focus(previousActive(state))

  // set focus (active) to next
  const next = () => focus(nextActive(state))

  // set focus (active) to last
  const last = () => focus(lastActive(state))

  // clear focus
  const none = () => focus(-1)

  // TODO: make re-usable
  // search for query value starting from the current position and looping round, set first found to active
  const search = (query: string) => {
    const searchable = state.active === -1
      ? state.items
      : state.items
        .slice(state.active + 1)
        .concat(state.items.slice(0, state.active + 1))

    const re = new RegExp(`^${query}`, 'i')
    const found = searchable.findIndex(x => x.value.match(re) && !x.disabled)  // TODO: exclude disabled

    if (found > -1) {
      const index = (found + state.active + 1) % state.items.length
      focus(index)
    }
  }

  // set the focus based on the HTMLElement passed which will be a menuitem element or null
  const focusNode = (node: HTMLElement | null) => focus(node ? state.items.findIndex(item => item.id === node.id && !item.disabled) : -1)

  // "two stage" dispatch is because button may be added last, but we want to wire behaviors to the method
  let onSelect = () => { }
  const select = () => onSelect()

  // menubutton
  function button(node: HTMLElement) {
    ensureID(node, prefix)
    set({ button: node.id })

    // TODO: create a behavior that can be passed an event generator function, use with items select
    // to raise event from the 'controller'
    onSelect = () => {
      set({ expanded: false, selected: state.active })
      const event = new CustomEvent('select', {
        detail: {
          selected: state.selected,
          value: state.items[state.selected].value,
        }
      })
      node.dispatchEvent(event)
    }

    const destroy = applyBehaviors(node, [
      setType('button'),
      setRole('button'),
      setHasPopup(),
      setTabIndex(0),
      reflectAriaLabel(store),
      reflectAriaExpanded(store),
      reflectAriaControls(store),
      onClick(toggle),
      onKeydown(
        keySpaceEnter(toggle),
        keyPreviousNext(last, first),
      ),
      focusOnClose(store),
    ])

    return {
      destroy,
    }
  }

  function items(node: HTMLElement) {
    ensureID(node, prefix)
    set({ menu: node.id, controls: node ? node.id : undefined })

    const destroy = applyBehaviors(node, [
      setRole('menu'),
      setTabIndex(0),
      onClickOutside(close),
      onClick(select),
      onPointerMoveChild('[role="menuitem"]', focusNode),
      onPointerOut(none),
      onKeydown(
        keySpaceEnter(select),
        keyEscape(close),
        keyFirstLast(first, last),
        keyPreviousNext(previous, next),
        keyTab(noop),
        keyCharacter(search),
      ),
      focusOnExpanded(store),
      reflectAriaActivedescendent(store),
    ])

    return {
      destroy,
    }
  }

  // TODO: allow "any" type of value, as long as a text extractor is supplied (default function is treat as a string)
  // NOTE: text value is required for searchability
  function item(node: HTMLElement, options?: ItemOptions) {
    ensureID(node, prefix)

    const update = (options?: ItemOptions) => {
      const values = getItemValues(node, options)
      const item = state.items.find(item => item.id === node.id)
      if (item) {
        Object.assign(item, values)
      } else {
        state.items.push({ id: node.id, ...values })
      }
      set({ items: state.items })
    }

    update(options)

    const destroy = applyBehaviors(node, [
      setTabIndex(-1),
      setRole('menuitem'),
      reflectAriaDisabled(store),
      removeOnDestroy(store),
    ])

    return {
      update,
      destroy,
    }
  }

  // expose a subset of our state, derive the selected value
  const { subscribe } = derived(store, $state => {
    const { active, expanded } = $state
    return { active, expanded, value: value() }
  })

  return {
    subscribe,
    button,
    items,
    item,
  }
}