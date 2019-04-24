import { Color } from 'tns-core-modules/color';
import { ios } from 'tns-core-modules/utils/utils';
import { ios as iosApp } from 'tns-core-modules/application';

import {
  RedirectEvent,
  BrowserResult,
  RedirectResult,
  AuthSessionResult,
  getDefaultOptions
} from './InAppBrowser.common';

type InAppBrowserOptions = {
  dismissButtonStyle?: 'done' | 'close' | 'cancel',
  preferredBarTintColor?: string,
  preferredControlTintColor?: string,
  readerMode?: boolean
}

declare var UIApplication: any;

const InAppBrowser = (NSObject as any).extend({
  redirectResolve: null,
  redirectReject: null,
  isAvailable(): Promise<boolean> {
    return Promise.resolve(ios.MajorVersion >= 9)
  },
  open(url: string, options: InAppBrowserOptions = {}): Promise<BrowserResult> {
    const self = this;
    return new Promise(function (resolve, reject) {
      if (!self.initializeWebBrowser(resolve, reject)) return

      const inAppBrowserOptions = getDefaultOptions(url, options);

      const safariVC = SFSafariViewController.alloc().initWithURLEntersReaderIfAvailable(
        NSURL.URLWithString(inAppBrowserOptions.url),
        inAppBrowserOptions.readerMode
      );
      safariVC.delegate = self;

      if (ios.MajorVersion >= 11) {
        if (inAppBrowserOptions.dismissButtonStyle === 'done') {
          safariVC.dismissButtonStyle = SFSafariViewControllerDismissButtonStyle.Done;
        }
        else if (inAppBrowserOptions.dismissButtonStyle === 'close') {
          safariVC.dismissButtonStyle = SFSafariViewControllerDismissButtonStyle.Close;
        }
        else if (inAppBrowserOptions.dismissButtonStyle === 'cancel') {
          safariVC.dismissButtonStyle = SFSafariViewControllerDismissButtonStyle.Cancel;
        }
      }

      if (ios.MajorVersion >= 10) {
        if (inAppBrowserOptions.preferredBarTintColor) {
          safariVC.preferredBarTintColor = new Color(inAppBrowserOptions.preferredBarTintColor).ios;
        }
        if (inAppBrowserOptions.preferredControlTintColor) {
          safariVC.preferredControlTintColor = new Color(inAppBrowserOptions.preferredControlTintColor).ios;
        }
      }

      safariVC.modalPresentationStyle = UIModalPresentationStyle.OverFullScreen;
      const safariHackVC = UINavigationController.alloc().initWithRootViewController(safariVC);
      safariHackVC.setNavigationBarHiddenAnimated(true, false);

      const app = ios.getter(UIApplication, UIApplication.sharedApplication);
      app.keyWindow.rootViewController.presentViewControllerAnimatedCompletion(safariHackVC, true, null);
    })
  },
  close() {
    const self = this;
    const app = ios.getter(UIApplication, UIApplication.sharedApplication);
    app.keyWindow.rootViewController.dismissViewControllerAnimatedCompletion(true, function () {
      self.redirectResolve({
        type: 'dismiss'
      });
      self.flowDidFinish();
    });
  },
  safariViewControllerDidCompleteInitialLoad(controller: SFSafariViewController, didLoadSuccessfully: boolean): void {
    console.log('Delegate, safariViewControllerDidCompleteInitialLoad: ' + didLoadSuccessfully);
  },
  safariViewControllerDidFinish(controller: SFSafariViewController): void {
    this.redirectResolve({
      type: 'cancel'
    });
    this.flowDidFinish();
  },
  flowDidFinish() {
    this.redirectResolve = null;
    this.redirectReject = null;
  },
  initializeWebBrowser(resolve, reject): boolean {
    if (this.redirectResolve) {
      reject('Another InAppBrowser is already being presented.');
      return false;
    }
    this.redirectResolve = resolve;
    this.redirectReject = reject;
    return true;
  }
}, {
  protocols: [SFSafariViewControllerDelegate]
});

export default InAppBrowser.new()