import Foundation
import Vision
import NaturalLanguage

func classificationText(_ text: String) -> String {
    var clean = text.precomposedStringWithCompatibilityMapping
    let patterns = [
        #"https?://\S+"#,
        #"`[^`]*`"#,
        #"(?<![A-Za-z0-9_])[A-Za-z0-9_./-]+\.(?:json|mjs|js|ts|png|gif|mp4|txt)(?![A-Za-z0-9_])"#,
        #"(?<![A-Za-z0-9_])(?:quantity|unitPrice|shipping|todo_write|read|auditId|DeepSeek|DSH)(?![A-Za-z0-9_])"#
    ]
    for pattern in patterns {
        let expression = try! NSRegularExpression(pattern: pattern)
        let range = NSRange(clean.startIndex..<clean.endIndex, in: clean)
        clean = expression.stringByReplacingMatches(in: clean, range: range, withTemplate: " ")
    }
    return clean.trimmingCharacters(in: .whitespacesAndNewlines)
}

func languageSegments(_ text: String) -> [[String: Any]] {
    let tokenizer = NLTokenizer(unit: .sentence)
    tokenizer.string = text
    var segments: [[String: Any]] = []
    tokenizer.enumerateTokens(in: text.startIndex..<text.endIndex) { range, _ in
        let sentence = String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !sentence.isEmpty else { return true }
        let recognizer = NLLanguageRecognizer()
        let classification = classificationText(sentence)
        recognizer.processString(classification)
        let hypotheses = recognizer.languageHypotheses(withMaximum: 5)
        segments.append([
            "text": sentence,
            "classificationText": classification,
            "language": recognizer.dominantLanguage?.rawValue ?? "und",
            "hypotheses": Dictionary(uniqueKeysWithValues: hypotheses.map { ($0.key.rawValue, $0.value) })
        ])
        return true
    }
    return segments
}

do {
    guard CommandLine.arguments.count == 3 else {
        throw NSError(domain: "media-ocr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Usage: ocr-media image language, or ocr-media --texts language with a JSON text array on stdin"])
    }
    let input = CommandLine.arguments[1]
    let language = CommandLine.arguments[2]
    let result: [String: Any]
    if input == "--texts" {
        let data = FileHandle.standardInput.readDataToEndOfFile()
        guard let texts = try JSONSerialization.jsonObject(with: data) as? [String] else {
            throw NSError(domain: "media-ocr", code: 3, userInfo: [NSLocalizedDescriptionKey: "Expected a JSON text array"])
        }
        result = ["language": language, "texts": texts.enumerated().map { index, text in
            ["index": index, "text": text, "segments": languageSegments(text)] as [String: Any]
        }]
    } else {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        let supported = try request.supportedRecognitionLanguages()
        guard supported.contains(language) else {
            throw NSError(domain: "media-ocr", code: 2, userInfo: [NSLocalizedDescriptionKey: "BLOCKED: Vision OCR language unavailable: \(language)"])
        }
        request.recognitionLanguages = language == "en-US" ? [language] : [language, "en-US"]
        let handler = VNImageRequestHandler(url: URL(fileURLWithPath: input), options: [:])
        try handler.perform([request])
        let lines = (request.results ?? []).compactMap { observation -> [String: Any]? in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            return ["text": candidate.string, "confidence": candidate.confidence,
                    "box": [observation.boundingBox.minX, observation.boundingBox.minY,
                            observation.boundingBox.width, observation.boundingBox.height],
                    "segments": languageSegments(candidate.string)]
        }
        result = ["language": language, "text": lines.map { $0["text"] as! String }.joined(separator: "\n"), "lines": lines]
    }
    let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    FileHandle.standardError.write(Data(("Media language recognition failed: \(error)\n").utf8))
    exit(2)
}
