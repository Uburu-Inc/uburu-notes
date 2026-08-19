package com.margelo.nitro.nitromlkit.digitalink

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.recognition.Ink
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.tasks.await

/**
 * Native Android implementation of DigitalInkRecognizer (MLKit Digital Ink).
 * Ink strokes (points with optional timestamps) go in; candidate
 * transcriptions come out. The per-language model downloads on first use.
 */
class HybridDigitalInkRecognizer : HybridDigitalInkRecognizerSpec() {

  private val modelManager by lazy { RemoteModelManager.getInstance() }

  private fun modelFor(languageTag: String): DigitalInkRecognitionModel {
    val id = DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag)
      ?: throw IllegalArgumentException("Unsupported language tag: $languageTag")
    return DigitalInkRecognitionModel.builder(id).build()
  }

  private fun buildInk(strokes: Array<InkStroke>): Ink {
    val ink = Ink.builder()
    for (stroke in strokes) {
      val sb = Ink.Stroke.builder()
      for (p in stroke.points) {
        val t = p.t
        sb.addPoint(
          if (t != null) Ink.Point.create(p.x.toFloat(), p.y.toFloat(), t.toLong())
          else Ink.Point.create(p.x.toFloat(), p.y.toFloat()),
        )
      }
      ink.addStroke(sb.build())
    }
    return ink.build()
  }

  override fun recognize(
    strokes: Array<InkStroke>,
    languageTag: String,
  ): Promise<Array<RecognitionCandidate>> {
    return Promise.async {
      val model = modelFor(languageTag)
      modelManager.download(model, DownloadConditions.Builder().build()).await()
      val recognizer = DigitalInkRecognition.getClient(
        DigitalInkRecognizerOptions.builder(model).build(),
      )
      try {
        val result = recognizer.recognize(buildInk(strokes)).await()
        result.candidates
          .map { RecognitionCandidate(it.text, it.score?.toDouble()) }
          .toTypedArray()
      } finally {
        recognizer.close()
      }
    }
  }

  override fun downloadModel(languageTag: String): Promise<Unit> {
    return Promise.async {
      modelManager.download(modelFor(languageTag), DownloadConditions.Builder().build()).await()
      Unit
    }
  }

  override fun isModelDownloaded(languageTag: String): Promise<Boolean> {
    return Promise.async { modelManager.isModelDownloaded(modelFor(languageTag)).await() }
  }

  override fun deleteModel(languageTag: String): Promise<Unit> {
    return Promise.async {
      modelManager.deleteDownloadedModel(modelFor(languageTag)).await()
      Unit
    }
  }

  override fun isAvailable(): Boolean = true
}
