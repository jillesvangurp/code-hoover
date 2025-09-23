@file:JsModule("sortablejs")
@file:JsNonModule

package sortable

import org.w3c.dom.HTMLElement

external class Sortable(
    element: HTMLElement,
    options: SortableOptions = definedExternally
)

external interface SortableEvent {
    val oldIndex: Int
    val newIndex: Int
}

external interface SortableOptions {
    var animation: Int?
    var onEnd: ((SortableEvent) -> Unit)?
    var handle: String?
    var delay: Int?
    var delayOnTouchOnly: Boolean?
    var touchStartThreshold: Int?
}
