@file:JsModule("qrcode")
@file:JsNonModule

package qrcode

import kotlin.js.Promise

external fun toDataURL(url: String, options: dynamic = definedExternally): Promise<String>

external fun toString(url: String, options: dynamic = definedExternally): Promise<String>

