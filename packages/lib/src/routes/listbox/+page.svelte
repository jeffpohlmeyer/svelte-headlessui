<script lang="ts">
	import { createListbox } from '$lib/listbox'
	import Transition from 'svelte-transition'
	import Selector from './Selector.svelte'
	import Check from './Check.svelte'

	type Person = { name: string }
	type People = Person[]

	// prettier-ignore
	const people = [
    { name: 'Wade Cooper' },
    { name: 'Arlene Mccoy' },
    { name: 'Devon Webb' },
    { name: 'Tom Cook' },
    { name: 'Tanya Fox' },
    { name: 'Hellen Schmidt' },
  ]

	// TODO: type list so 'selected' isn't 'any'
	const listbox = createListbox({ label: 'Actions', selected: people[2] })

	function onSelect(e: Event) {
		console.log('select', (e as CustomEvent).detail)
	}
</script>

<button class="m-2" on:click={_ => listbox.set({ selected: people[1] })}>Set Arlene</button>
<button class="m-2" on:click={_ => listbox.set({ selected: people[4] })}>Set Tanya</button>

<div class="flex w-full flex-col items-center justify-center">
	<div class="fixed top-56 w-72">
		<div class="relative mt-1">
			<button
				use:listbox.button
				on:select={onSelect}
				class="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm"
			>
				<span class="block truncate">{$listbox.selected.name}</span>
				<span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
					<Selector class="h-5 w-5 text-gray-400" />
				</span>
			</button>

			<Transition show={$listbox.expanded} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
				<ul
					use:listbox.items
					class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
				>
					{#each people as value}
						{@const active = $listbox.active === value}
						{@const selected = $listbox.selected === value}
						<li
							class="relative cursor-default select-none py-2 pl-10 pr-4 {active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'}"
							use:listbox.item={{ value }}
						>
							<span class="block truncate {selected ? 'font-medium' : 'font-normal'}">{value.name}</span>
							{#if selected}
								<span class="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
									<Check class="h-5 w-5" />
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</Transition>
		</div>
	</div>
</div>
