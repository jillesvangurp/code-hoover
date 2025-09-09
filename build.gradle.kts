import org.jetbrains.kotlin.gradle.targets.js.testing.KotlinJsTest

plugins {
    kotlin("multiplatform")
    kotlin("plugin.serialization")
}

repositories {
    mavenCentral()
    maven("https://maven.tryformation.com/releases") {
        content {
            includeGroup("com.jillesvangurp")
            includeGroup("com.github.jillesvangurp")
            includeGroup("com.tryformation")
            includeGroup("com.tryformation.fritz2")
        }
    }
}

kotlin {
    js(IR) {
        browser {
            webpackTask {
                // settingt this to false disables anything to do with webpack so we can use vite
                enabled = true
                // sadly we need webpack to bundle things up for vite for now
                mainOutputFileName = "app.js"
                // vite processes and adds tailwind styling; so there's no need for
                // any webpack hackery for that.
            }
            testTask {
                // karma is a PITA, do proper unit tests without a browser
                useMocha()
            }
        }
    }.binaries.executable()

    sourceSets {
        commonMain {
            dependencies {
                implementation(kotlin("stdlib-common"))
                implementation("dev.fritz2:core:_")
                implementation("dev.fritz2:headless:_")
                implementation("org.jetbrains:markdown:_")
                implementation(KotlinX.serialization.json)
                implementation(KotlinX.datetime)
                implementation("com.jillesvangurp:kotlinx-serialization-extensions:_")
                implementation(KotlinX.serialization.json)
                implementation(Koin.core)
            }
        }

        commonTest {
            dependencies {
                implementation(kotlin("test-common"))
                implementation(kotlin("test-annotations-common"))
                implementation("io.kotest:kotest-assertions-core:_")
                implementation(npm("@zxing/browser","_"))
                implementation(npm("@zxing/library","_"))
            }
        }

        jsMain  {
            dependencies {
                implementation(kotlin("stdlib-js"))

                // fluent-js
                implementation("com.tryformation:fluent-kotlin:_")
                implementation(npm("@zxing/browser","_"))
                implementation(npm("@zxing/library","_"))
                implementation(npm("qrcode","_"))
            }
        }

        jsTest  {
            dependencies {
                implementation(kotlin("test-js"))
            }
        }

        all {
            languageSettings.apply {
                optIn("kotlin.ExperimentalStdlibApi")
                optIn("kotlin.RequiresOptIn")
            }
        }
    }
}

tasks.withType<KotlinJsTest>().configureEach {
    // Gradle 9 defaults to failing if no tests are discovered.
    // Disable this behavior to allow build to succeed without tests.
    failOnNoDiscoveredTests = false
}




