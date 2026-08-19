package com.nitromlkit.digitalink

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.digitalink.NitroMLKitDigitalInkOnLoad

/**
 * Loads the native library and registers the DigitalInkRecognizer HybridObject at
 * startup via Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitDigitalInkPackage : Module() {
  init {
    NitroMLKitDigitalInkOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitDigitalInk")
  }
}
