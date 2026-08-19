import Foundation
import NitroModules
import MLKitCommon
import MLKitDigitalInkRecognition

/**
 * Native iOS implementation of DigitalInkRecognizer (MLKit Digital Ink).
 * Conforms to the Nitrogen-generated HybridDigitalInkRecognizerSpec protocol.
 *
 * Ink strokes (points with optional timestamps) go in; candidate transcriptions
 * come out. The per-language model downloads on first use. Model downloads are
 * notification-based on iOS (unlike the Task-based Android API), so
 * `ModelManager.download(_:conditions:)` is bridged to async via a
 * NotificationCenter observer wrapped in a continuation.
 */
class HybridDigitalInkRecognizer: HybridDigitalInkRecognizerSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridDigitalInkRecognizer>.size }

    // MARK: - Lazy MLKit model manager
    private lazy var modelManager: ModelManager = ModelManager.modelManager()

    // MARK: - Helpers

    /// Resolve a BCP-47 language tag to a `DigitalInkRecognitionModel`, or throw.
    private func model(for languageTag: String) throws -> DigitalInkRecognitionModel {
        // `modelIdentifierForLanguageTag:` is a failable (non-throwing) init on
        // iOS — it returns nil for an unsupported tag.
        guard let identifier = DigitalInkRecognitionModelIdentifier(forLanguageTag: languageTag) else {
            throw RuntimeError.error(withMessage: "Unsupported language tag: \(languageTag)")
        }
        return DigitalInkRecognitionModel(modelIdentifier: identifier)
    }

    /// Build a `Ink` from the Nitro InkStroke array.
    private func buildInk(from strokes: [InkStroke]) -> Ink {
        // On iOS these are top-level types (NS_SWIFT_NAME): StrokePoint / Stroke /
        // Ink — NOT nested Ink.Point / Ink.Stroke (that's the Android spelling).
        let mlStrokes: [Stroke] = strokes.map { stroke in
            let points: [StrokePoint] = stroke.points.map { p in
                if let t = p.t {
                    return StrokePoint(x: Float(p.x), y: Float(p.y), t: Int(t))
                } else {
                    return StrokePoint(x: Float(p.x), y: Float(p.y))
                }
            }
            return Stroke(points: points)
        }
        return Ink(strokes: mlStrokes)
    }

    /// Bridge the notification-based ML Kit model download to async/await.
    private func awaitModelDownload(_ model: DigitalInkRecognitionModel,
                                    conditions: ModelDownloadConditions) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let center = NotificationCenter.default
            var didResume = false
            var successObserver: NSObjectProtocol?
            var failObserver: NSObjectProtocol?

            func cleanup() {
                if let successObserver = successObserver { center.removeObserver(successObserver) }
                if let failObserver = failObserver { center.removeObserver(failObserver) }
            }

            func isForThisModel(_ note: Notification) -> Bool {
                guard let downloaded = note.userInfo?[ModelDownloadUserInfoKey.remoteModel.rawValue] as? NSObject else {
                    return false
                }
                return downloaded.isEqual(model)
            }

            successObserver = center.addObserver(forName: .mlkitModelDownloadDidSucceed,
                                                 object: nil, queue: .main) { note in
                guard !didResume, isForThisModel(note) else { return }
                didResume = true
                cleanup()
                continuation.resume()
            }

            failObserver = center.addObserver(forName: .mlkitModelDownloadDidFail,
                                              object: nil, queue: .main) { note in
                guard !didResume, isForThisModel(note) else { return }
                didResume = true
                cleanup()
                let err = note.userInfo?[ModelDownloadUserInfoKey.error.rawValue] as? Error
                continuation.resume(throwing: err ?? RuntimeError.error(
                    withMessage: "Failed to download digital-ink model"))
            }

            // Kicks off the download; progress is reported via the observed notifications.
            _ = self.modelManager.download(model, conditions: conditions)
        }
    }

    // MARK: - Protocol methods

    func recognize(strokes: [InkStroke], languageTag: String) throws -> Promise<[RecognitionCandidate]> {
        return Promise.async {
            let model = try self.model(for: languageTag)
            try await self.awaitModelDownload(model, conditions: ModelDownloadConditions())

            let options = DigitalInkRecognizerOptions(model: model)
            let recognizer = DigitalInkRecognizer.digitalInkRecognizer(options: options)
            let ink = self.buildInk(from: strokes)

            return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[RecognitionCandidate], Error>) in
                recognizer.recognize(ink: ink) { result, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        let candidates = (result?.candidates ?? []).map {
                            RecognitionCandidate(text: $0.text, score: $0.score?.doubleValue)
                        }
                        continuation.resume(returning: candidates)
                    }
                }
            }
        }
    }

    func downloadModel(languageTag: String) throws -> Promise<Void> {
        return Promise.async {
            let model = try self.model(for: languageTag)
            try await self.awaitModelDownload(model, conditions: ModelDownloadConditions())
        }
    }

    func isModelDownloaded(languageTag: String) throws -> Promise<Bool> {
        return Promise.async {
            let model = try self.model(for: languageTag)
            // `isModelDownloaded(_:)` is synchronous on iOS.
            return self.modelManager.isModelDownloaded(model)
        }
    }

    func deleteModel(languageTag: String) throws -> Promise<Void> {
        return Promise.async {
            let model = try self.model(for: languageTag)
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                self.modelManager.deleteDownloadedModel(model) { error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }
        }
    }

    func isAvailable() throws -> Bool {
        return true
    }
}
