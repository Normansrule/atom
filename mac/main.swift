// Atom for macOS: a window around one HTML file.
//
// The whole app is app/atom.html, copied into the bundle's Resources as
// index.html by build-mac-app.sh. This shell does five things and nothing
// else: opens a window, loads that file, sends web links to your browser,
// recovers if the page's process ever stops, and gives the app a normal Mac
// menu bar. No network access, no bridge into the system, no data collected.
//
// Build: mac/build-mac-app.sh   (needs the Xcode command line tools)

import Cocoa
import WebKit

// Where the Help menu points. scripts and the publishing steps rewrite the
// account name if the repository lives somewhere else.
private let siteURL = URL(string: "https://normansrule.github.io/atom/")!
private let repoURL = URL(string: "https://github.com/normansrule/atom")!
private let issuesURL = URL(string: "https://github.com/normansrule/atom/issues/new/choose")!
private let releasesURL = URL(string: "https://github.com/normansrule/atom/releases")!

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!

    func applicationDidFinishLaunching(_ note: Notification) {
        buildMenu()
        buildWindow()
        loadPage()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    // Newer macOS asks apps to opt in to secure state restoration.
    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool { true }

    private func buildWindow() {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.websiteDataStore = .default()                   // keeps the theme and mission progress between launches
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.setValue(false, forKey: "drawsBackground")      // no white flash before the first frame
        if #available(macOS 13.3, *) { webView.isInspectable = true }

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let w = min(1440, screen.width - 60), h = min(960, screen.height - 60)
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: w, height: h),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Atom"
        window.backgroundColor = NSColor(srgbRed: 0.043, green: 0.047, blue: 0.051, alpha: 1)   // the chamber's ground
        window.minSize = NSSize(width: 820, height: 600)
        window.contentView = webView
        window.center()
        window.setFrameAutosaveName("AtomMain")                // restores the saved size and position when there is one
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func loadPage() {
        guard let res = Bundle.main.resourceURL else { return fail("The app bundle has no Resources folder.") }
        let file = res.appendingPathComponent("index.html")
        guard FileManager.default.fileExists(atPath: file.path) else { return fail("index.html is missing from the app bundle.") }
        webView.loadFileURL(file, allowingReadAccessTo: res)
    }

    private func fail(_ message: String) {
        let a = NSAlert()
        a.messageText = "Atom could not start"
        a.informativeText = message
        a.alertStyle = .critical
        a.runModal()
        NSApp.terminate(nil)
    }

    // Links to the web (sources, the repository) open in your browser, never in
    // the app. Only the page inside the bundle may load here: a file dropped on
    // the window would otherwise replace Atom with no way back.
    func webView(_ wv: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.cancel); return
        }
        switch scheme {
        case "http", "https", "mailto":
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
        case "file":
            let res = Bundle.main.resourceURL?.standardizedFileURL.path
            let inside = res.map { url.standardizedFileURL.path.hasPrefix($0 + "/") } ?? false
            decisionHandler(inside ? .allow : .cancel)
        case "about", "data", "blob":
            decisionHandler(.allow)
        default:
            decisionHandler(.cancel)
        }
    }

    func webView(_ wv: WKWebView, createWebViewWith cfg: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url, let scheme = url.scheme?.lowercased(),
           scheme == "http" || scheme == "https" || scheme == "mailto" {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    // If the page's process is ever stopped (memory pressure, a GPU reset),
    // load it again rather than leave an empty window.
    func webViewWebContentProcessDidTerminate(_ wv: WKWebView) { loadPage() }

    @objc func reloadPage(_ sender: Any?) { loadPage() }   // always the app's own page, whatever is showing
    @objc func openSite(_ sender: Any?) { NSWorkspace.shared.open(siteURL) }
    @objc func openRepo(_ sender: Any?) { NSWorkspace.shared.open(repoURL) }
    @objc func reportProblem(_ sender: Any?) { NSWorkspace.shared.open(issuesURL) }
    @objc func openReleases(_ sender: Any?) { NSWorkspace.shared.open(releasesURL) }

    private func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem(); main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Atom", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(withTitle: "Check for Updates…", action: #selector(openReleases(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Atom", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let others = appMenu.addItem(withTitle: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        others.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(withTitle: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Atom", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Edit")
        edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit

        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let view = NSMenu(title: "View")
        view.addItem(withTitle: "Reload", action: #selector(reloadPage(_:)), keyEquivalent: "r")
        let full = view.addItem(withTitle: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        full.keyEquivalentModifierMask = [.command, .control]
        viewItem.submenu = view

        let winItem = NSMenuItem(); main.addItem(winItem)
        let win = NSMenu(title: "Window")
        win.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        win.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winItem.submenu = win
        NSApp.windowsMenu = win

        let helpItem = NSMenuItem(); main.addItem(helpItem)
        let help = NSMenu(title: "Help")
        help.addItem(withTitle: "Atom Website", action: #selector(openSite(_:)), keyEquivalent: "")
        help.addItem(withTitle: "Source Code on GitHub", action: #selector(openRepo(_:)), keyEquivalent: "")
        help.addItem(withTitle: "Report a Problem or a Science Error…", action: #selector(reportProblem(_:)), keyEquivalent: "")
        helpItem.submenu = help
        NSApp.helpMenu = help

        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
