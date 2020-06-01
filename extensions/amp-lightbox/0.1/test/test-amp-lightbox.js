/**
 * Copyright 2020 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '../amp-lightbox';
import * as dom from '../../../../src/dom';
import {ActionService} from '../../../../src/service/action-impl';
import {ActionTrust} from '../../../../src/action-constants';
import {Keys} from '../../../../src/utils/key-codes';
import {Services} from '../../../../src/services';

describes.realWin(
  'amp-lightbox component',
  {
    amp: {
      extensions: ['amp-lightbox'],
      runtimeOn: true,
    },
  },
  env => {
    let win, doc;

    beforeEach(() => {
      win = env.win;
      doc = win.document;
    });

    function createLightbox() {
      const element = dom.createElementWithAttributes(doc, 'amp-lightbox', {
        'id': 'myLightbox',
        'layout': 'nodisplay',
      });
      const randomButton = dom.createElementWithAttributes(doc, 'button', {
        'id': 'randomButton',
      });
      randomButton.textContent = 'Something to focus on';
      element.appendChild(randomButton);

      const closeButton = dom.createElementWithAttributes(doc, 'button', {
        'id': 'closeButton',
        'on': 'tap:myLightbox.close',
      });
      closeButton.textContent = 'X';
      element.appendChild(closeButton);
      doc.body.appendChild(element);

      return element
        .build()
        .then(() => element.layoutCallback())
        .then(() => element);
    }

    function createButton() {
      const button = doc.createElement('button');
      button.textContent = 'Open lightbox';
      doc.body.appendChild(button);
      return button;
    }

    it('should allow default actions in email documents', async () => {
      doc.documentElement.setAttribute('amp4email', '');
      const action = new ActionService(env.ampdoc, doc);
      env.sandbox.stub(Services, 'actionServiceForDoc').returns(action);

      const element = createLightbox();
      env.sandbox.spy(element, 'enqueAction');
      env.sandbox.stub(element, 'getDefaultActionAlias');
      await dom.whenUpgradedToCustomElement(element);

      ['open', 'close'].forEach(method => {
        action.execute(
          element,
          method,
          null,
          'source',
          'caller',
          'event',
          ActionTrust.HIGH
        );
        expect(element.enqueAction).to.be.calledWith(
          env.sandbox.match({
            actionEventType: '?',
            args: null,
            caller: 'caller',
            event: 'event',
            method,
            node: element,
            source: 'source',
            trust: ActionTrust.HIGH,
          })
        );
      });
    });

    it('should close on ESC', () => {
      const lightbox = createLightbox();
      const sourceElement = doc.createElement('button');
      sourceElement.textContent = 'Open lightbox';
      doc.body.appendChild(sourceElement);
      const nextElement = doc.createElement('button');
      nextElement.textContent = 'Something to focus on';
      doc.body.appendChild(nextElement);

      const impl = lightbox.implementation_;
      const setupCloseSpy = env.sandbox.spy(impl, 'close');

      impl.open_({caller: sourceElement});
      impl.closeOnEscape_(new KeyboardEvent('keydown', {key: Keys.ENTER}));
      impl.closeOnEscape_(new KeyboardEvent('keydown', {key: Keys.ESCAPE}));
      expect(setupCloseSpy).to.be.calledOnce;
    });

    // Accessibility
    // 1. If there is focus in the lightbox, we do not create a top close button or change focus
    // 2. If there is no focus in the lightbox but has close btn, we focus on it
    // 3. If there is no focus in the lightbox or close btn, we create a close button and focus on it
    // 4. If a user "blurs" by focusing on an element that is in the amp-lightbox subtree, it should stay open.
    // 5a. If a user "blurs" before the amp-lightbox subtree, it should close.
    // 5b. If a user "blurs" after the amp-lightbox subtree, it should close.
    // 6. On close, focus should go back to trigger
    // 7. Ad: we do not create a button and we focus on the `i-amphtml-ad-close-header`
    //it.only('should not change focus if user has set it already', () => {
    it.only('should focus on close button if no handmade focus but has close button', () => {
      return createLightbox().then(lightbox => {
        const impl = lightbox.implementation_;
        impl.layoutCallback = () => {};

        impl.getHistory_ = () => {
          return {
            pop: () => {},
            push: () => Promise.resolve(11),
          };
        };
        const sourceElement = createButton();
        const tryFocusSpy = env.sandbox.spy(dom, 'tryFocus');
        const tryIt = env.sandbox.spy(impl, 'focusInModal_');
        impl.open_({caller: sourceElement});
        console.log('4444444444 spy');
        console.log(tryFocusSpy.getCalls());
        console.log(tryIt.getCalls());
        //console.log(env.sandbox.spy.printf('%n / %c fois / %*'));
        impl.close();
        expect(tryFocusSpy).to.be.calledOnce();
      });
    });

    it('should focus on close button if no handmade focus but has close button', () => {
      const lightbox = createLightbox();

      const tryFocus = env.sandbox.spy(dom, 'tryFocus');
      //const tryOpen = env.sandbox.spy(lightbox, 'open_');
      const impl = lightbox.implementation_;
      impl.open_();

      console.log('33333333 spy');
      console.log(tryFocus.getCalls());
      //console.log(tryOpen.getCalls());
      //console.log(env.sandbox.spy.printf('%n / %c fois / %*'));
      expect(tryFocus).to.be.calledWith('button');
    });

    it('should return focus to source element after close', () => {
      const lightbox = createLightbox();
      const sourceElement = createButton();

      const impl = lightbox.implementation_;
      tryFocus(sourceElement);

      expect(doc.activeElement).to.equal(sourceElement);
      impl.open_({caller: sourceElement});
      expect(doc.activeElement).not.to.equal(sourceElement);

      const tryFocusSpy = env.sandbox.spy(impl, 'tryFocus');
      impl.close();

      expect(tryFocusSpy).to.be.calledWith(sourceElement);
      expect(doc.activeElement).to.equal(sourceElement);
    });
  }
);
