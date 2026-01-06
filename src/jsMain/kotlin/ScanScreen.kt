import dev.fritz2.core.RenderContext
import dev.fritz2.core.Store
import dev.fritz2.core.storeOf
import kotlinx.browser.document
import kotlinx.browser.window
import kotlinx.coroutines.Job
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.await
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import localization.getTranslationString
import localization.translate
import org.w3c.dom.HTMLVideoElement
import org.w3c.dom.mediacapture.MediaStream
import org.w3c.dom.mediacapture.MediaStreamTrack
import qr.QrData
import qr.SavedQrCode
import qr.asText
import qr.defaultDisplayName
import qr.parseVCard
import SoundEffects

fun RenderContext.scanScreen(
    scanningStore: Store<Boolean>,
    scansStore: Store<List<ScanResult>>,
    codeReader: BrowserMultiFormatReader,
    savedCodesStore: Store<List<SavedQrCode>>,
    json: Json,
    soundEffects: SoundEffects,
) {
    val scope = MainScope()
    var controls: IScannerControls? = null
    var mediaStream: MediaStream? = null
    var detectionJob: Job? = null
    val barcodeDetectorAvailable = isBarcodeDetectorAvailable()
    val scannerLabelStore = storeOf(
        if (barcodeDetectorAvailable) "Barcode Detector API" else "@zxing/browser",
    )

    fun stopBarcodeDetector() {
        mediaStream?.getTracks()?.forEach(MediaStreamTrack::stop)
        mediaStream = null
        (document.getElementById("video") as? HTMLVideoElement)?.apply {
            pause()
            srcObject = null
        }
    }

    fun stopScanning() {
        controls?.stop()
        controls = null
        detectionJob?.cancel()
        detectionJob = null
        stopBarcodeDetector()
        scanningStore.update(false)
    }

    suspend fun startBarcodeDetector(videoElement: HTMLVideoElement): Boolean {
        return try {
            val detector = BarcodeDetector()
            val stream = window.navigator.mediaDevices.getUserMedia(
                js("{ video: { facingMode: 'environment' } }"),
            ).await()
            mediaStream = stream
            videoElement.srcObject = stream
            videoElement.play().await()
            scannerLabelStore.update("Barcode Detector API")
            detectionJob = scope.launch {
                while (scanningStore.current) {
                    try {
                        val results = detector.detect(videoElement).await()
                        if (results.isNotEmpty()) {
                            results.forEach { barcode ->
                                val text = barcode.rawValue
                                val formatOrdinal =
                                    barcodeFormatOrdinal(
                                        barcode.format.replace("-", "_").uppercase(),
                                    )
                                val existing = scansStore.current
                                if (existing.none { it.text == text }) {
                                    scansStore.update(
                                        listOf(ScanResult(text, formatOrdinal)) + existing,
                                    )
                                    soundEffects.playScanSuccess()
                                }
                            }
                        }
                        delay(300)
                    } catch (_: Throwable) {
                        delay(300)
                    }
                }
            }
            true
        } catch (_: Throwable) {
            stopBarcodeDetector()
            false
        }
    }

    fun startZxingScanner() {
        scannerLabelStore.update("@zxing/browser")
        codeReader.decodeFromVideoDevice(
            null,
            "video",
        ) { result, _, c ->
            controls = c
            if (result != null) {
                val text = result.text
                val format = result.format
                val existing = scansStore.current
                if (existing.none { it.text == text }) {
                    scansStore.update(
                        listOf(ScanResult(text, format)) + existing,
                    )
                    soundEffects.playScanSuccess()
                }
            }
        }
    }
    scanningStore.data.render { scanning ->
        section("flex flex-col items-center gap-4 w-full") {
            div("join flex-wrap w-full justify-center md:justify-start") {
                if (scanning) {
                    button("btn btn-error btn-sm w-24 flex items-center gap-1") {
                        iconStop()
                        translate(DefaultLangStrings.Stop)
                        clicks handledBy {
                            stopScanning()
                        }
                    }
                } else {
                    button("btn btn-primary btn-sm w-24 flex items-center gap-1") {
                        iconCamera()
                        translate(DefaultLangStrings.Scan)
                        clicks handledBy {
                            scanningStore.update(true)
                            scope.launch {
                                var videoElement: HTMLVideoElement? = null
                                for (attempt in 0 until 5) {
                                    videoElement =
                                        document.getElementById("video") as? HTMLVideoElement
                                    if (videoElement != null) break
                                    delay(50)
                                }
                                val targetVideo = videoElement
                                if (targetVideo == null) {
                                    stopScanning()
                                } else {
                                    val startedWithNative =
                                        barcodeDetectorAvailable && startBarcodeDetector(targetVideo)
                                    if (!startedWithNative) {
                                        startZxingScanner()
                                    }
                                }
                            }
                        }
                    }
                }
                button("btn btn-secondary btn-sm w-24 flex items-center gap-1") {
                    iconXMark()
                    translate(DefaultLangStrings.Clear)
                    clicks handledBy {
                        scansStore.update(emptyList())
                    }
                }
            }
            scannerLabelStore.data.render { label ->
                p("text-sm opacity-70") {
                    translate(DefaultLangStrings.ScannerLibrary, mapOf("value" to label))
                }
            }
            if (!scanning) {
                p { translate(DefaultLangStrings.WelcomeText) }
            } else {
                video("mx-auto w-full h-[33vh] border rounded-md", id = "video") {}
            }
        }
    }
    scansStore.data.render { scans ->
        p("font-semibold mb-2") {
            translate(DefaultLangStrings.ScannedCodes, mapOf("count" to scans.size))
        }
    }
    ul("space-y-2 w-full") {
        scansStore.data.renderEach { scan ->
            li("card bg-base-200 p-3 w-full") {
                p("break-words font-mono") { +scan.text }
                p("text-xs opacity-70") { +barcodeFormatName(scan.format) }
                div("mt-2 join flex-wrap w-full justify-center sm:justify-start") {
                    button("btn btn-primary btn-xs w-24 flex items-center gap-1") {
                        attr("title", getTranslationString(DefaultLangStrings.Copy))
                        iconDocumentDuplicate()
                        translate(DefaultLangStrings.Copy)
                        clicks handledBy { window.navigator.clipboard.writeText(scan.text) }
                    }
                    if (scan.text.startsWith("http://") || scan.text.startsWith("https://")) {
                        button("btn btn-secondary btn-xs w-24 flex items-center gap-1") {
                            iconArrowTopRightOnSquare()
                            translate(DefaultLangStrings.Open)
                            clicks handledBy { window.open(scan.text, "_blank") }
                        }
                    }
                    button("btn btn-accent btn-xs w-24 flex items-center gap-1") {
                        iconCheck()
                        translate(DefaultLangStrings.Save)
                        clicks handledBy {
                            val rawText = scan.text.trim()
                            fun fromText(text: String): SavedQrCode {
                                val card = parseVCard(text)
                                val data: QrData = card ?: QrData.Text(text)
                                val normalized = data.asText()
                                val defaultName = data.defaultDisplayName().ifBlank { normalized }
                                return SavedQrCode(defaultName, normalized, data)
                            }
                            var entry = if (barcodeFormatName(scan.format) == "QR_CODE") {
                                try {
                                    json.decodeFromString<SavedQrCode>(scan.text).let { saved ->
                                        if (saved.name.isBlank()) {
                                            val fallback = saved.data.defaultDisplayName().ifBlank { saved.text }
                                            saved.copy(name = fallback)
                                        } else saved
                                    }
                                } catch (_: Throwable) {
                                    fromText(rawText)
                                }
                            } else {
                                fromText(rawText)
                            }
                            val fallbackName = entry.data.defaultDisplayName().ifBlank { entry.text }
                            val defaultName = entry.name.ifBlank { fallbackName }
                            val name = window.prompt(
                                getTranslationString(DefaultLangStrings.Name),
                                defaultName,
                            ) ?: defaultName
                            val finalName = if (name.isBlank()) fallbackName else name
                            entry = entry.copy(name = finalName)
                            savedCodesStore.update(savedCodesStore.current + entry)
                        }
                    }
                    button("btn btn-warning btn-xs w-24 flex items-center gap-1") {
                        iconTrash()
                        translate(DefaultLangStrings.Delete)
                        clicks handledBy {
                            scansStore.update(scansStore.current.filterNot { it == scan })
                            soundEffects.playDelete()
                        }
                    }
                }
            }
        }
    }
}

private fun isBarcodeDetectorAvailable(): Boolean =
    js("typeof BarcodeDetector !== 'undefined'") as Boolean
