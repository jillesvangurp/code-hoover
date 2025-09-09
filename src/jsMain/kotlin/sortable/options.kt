package sortable

inline fun sortableOptions(block: SortableOptions.() -> Unit): SortableOptions =
    (js("{}") as SortableOptions).apply(block)
