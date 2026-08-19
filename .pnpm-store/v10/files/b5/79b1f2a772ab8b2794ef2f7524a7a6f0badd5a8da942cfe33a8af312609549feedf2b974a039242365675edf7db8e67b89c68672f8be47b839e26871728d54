#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroMLKitDigitalInkOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::mlkit::digitalink::registerAllNatives();
  });
}
