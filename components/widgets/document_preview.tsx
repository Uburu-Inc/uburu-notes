import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  BORDER_COLOR,
  MUTED_TEXT_COLOR,
  STROKE_COLOR,
  SURFACE_COLOR,
  UBURU_ORANGE,
} from '../../lib/theme';

type Document = { url: string; fileName: string };

function isPdf({ url, fileName }: Document) {
  return /\.pdf$/i.test(fileName) || /\.pdf$/i.test(url.split('?')[0]);
}

/**
 * Opens an uploaded file's `view_url` full screen, inside the app. Returns
 * `open` for the buttons and `preview`, the modal element to render once on
 * the screen.
 *
 * Android's WebView cannot draw a PDF (it only offers to download it), so PDFs
 * are drawn by PDF.js inside the WebView instead (see PdfView), on both
 * platforms so they look the same; everything else loads in the WebView as is.
 */
export function useDocumentPreview() {
  const [openDocument, setOpenDocument] = useState<Document | null>(null);

  const open = useCallback((url: string, fileName: string) => {
    if (url) setOpenDocument({ url, fileName });
  }, []);

  const preview = (
    <DocumentPreviewModal document={openDocument} onClose={() => setOpenDocument(null)} />
  );

  return { open, preview };
}

interface ModalProps {
  document: Document | null;
  onClose: () => void;
}

function DocumentPreviewModal({ document, onClose }: ModalProps) {
  const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState(false);

  return (
    <Modal
      visible={document !== null}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setFailed(false)}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {document?.fileName || 'Document'}
          </Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        {document && !failed && isPdf(document) ? (
          <PdfView url={document.url} onFailed={() => setFailed(true)} />
        ) : document && !failed ? (
          <WebView
            source={{ uri: document.url }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.centered}>
                <ActivityIndicator color={MUTED_TEXT_COLOR} />
              </View>
            )}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
            style={styles.webview}
          />
        ) : (
          <View style={styles.fill}>
            {/* The view_url is short-lived, so an expired link lands here; a
                refresh of the screen behind fetches a new one. */}
            <Text style={styles.message}>
              This file could not be loaded. Close it, pull down to refresh the page, then open it
              again.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// PDF.js, pinned. The 3.x builds are plain scripts, which a WebView page loaded
// from a string can run without a module loader.
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

// The page is given an https origin so PDF.js can start its worker from the CDN.
const VIEWER_BASE_URL = 'https://viewer.uburu.local/';

/**
 * Downloads the PDF in the app (native fetch, so the storage host's CORS rules
 * do not apply) and hands its bytes to a small PDF.js page, which draws every
 * page onto a canvas. Pinch to zoom; pages render at twice the screen density
 * so they stay sharp when zoomed in.
 */
function PdfView({ url, onFailed }: { url: string; onFailed: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setRendering(true);

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`The file could not be downloaded (${response.status}).`);
        const base64 = await blobToBase64(await response.blob());
        if (!cancelled) setHtml(pdfViewerHtml(base64));
      } catch (error) {
        console.warn('Could not load the PDF:', error);
        if (!cancelled) onFailed();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const onMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    if (message === 'rendered') setRendering(false);
    if (message.startsWith('error')) {
      console.warn('PDF viewer:', message);
      onFailed();
    }
  };

  return (
    <View style={styles.pdf}>
      {html ? (
        <WebView
          source={{ html, baseUrl: VIEWER_BASE_URL }}
          originWhitelist={['*']}
          onMessage={onMessage}
          onError={onFailed}
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          style={styles.webview}
        />
      ) : null}
      {rendering ? (
        <View style={[styles.centered, styles.loadingCover]}>
          <ActivityIndicator color={MUTED_TEXT_COLOR} />
        </View>
      ) : null}
    </View>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(blob);
  });
}

function pdfViewerHtml(base64: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
<style>
  html, body { margin: 0; background: #e5e7eb; }
  #pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0; }
  canvas { display: block; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
</style>
<script src="${PDFJS}/pdf.min.js"></script>
</head>
<body>
<div id="pages"></div>
<script>
  const post = (message) => window.ReactNativeWebView.postMessage(message);
  window.onerror = (message) => post('error: ' + message);

  (async () => {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';
      const raw = atob('${base64}');
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const container = document.getElementById('pages');
      const width = document.documentElement.clientWidth - 24;
      const density = Math.min((window.devicePixelRatio || 1) * 2, 6);

      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const fit = width / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: fit * density });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = viewport.width / density + 'px';
        canvas.style.height = viewport.height / density + 'px';
        container.appendChild(canvas);

        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        // The first page is enough to lift the spinner; the rest follow below it.
        if (number === 1) post('rendered');
      }
    } catch (error) {
      post('error: ' + (error && error.message ? error.message : error));
    }
  })();
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SURFACE_COLOR,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: BORDER_COLOR,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    color: STROKE_COLOR,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  close: {
    color: UBURU_ORANGE,
    fontSize: 15,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 24,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pdf: {
    flex: 1,
  },
  loadingCover: {
    backgroundColor: SURFACE_COLOR,
  },
  fill: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  message: {
    color: MUTED_TEXT_COLOR,
    fontSize: 14,
    textAlign: 'center',
  },
});
