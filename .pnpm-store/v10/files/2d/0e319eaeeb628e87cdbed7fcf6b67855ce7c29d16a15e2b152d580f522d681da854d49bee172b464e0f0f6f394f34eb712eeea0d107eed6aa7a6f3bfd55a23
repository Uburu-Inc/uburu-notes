/* eslint-disable import/no-anonymous-default-export */

global.SkiaViewApi = {
  views: {},
  deferedPictures: {},
  unregisteredViews: new Set(),
  deferedOnSize: {},
  web: true,
  registerView(nativeId, view) {
    this.unregisteredViews.delete(nativeId);
    // Maybe a picture for this view was already set
    if (this.deferedPictures[nativeId]) {
      view.setPicture(this.deferedPictures[nativeId]);
      delete this.deferedPictures[nativeId];
    }
    this.views[nativeId] = view;
  },
  unregisterView(nativeId) {
    // Views must be removed on unmount: the handle's closures capture the
    // canvas element, so a stale entry retains the whole detached DOM tree.
    this.unregisteredViews.add(nativeId);
    delete this.views[nativeId];
    delete this.deferedPictures[nativeId];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setJsiProperty(nativeId, name, value) {
    if (name === "picture") {
      const id = `${nativeId}`;
      if (this.views[id]) {
        this.views[id].setPicture(value);
      } else if (!this.unregisteredViews.has(id)) {
        this.deferedPictures[id] = value;
      }
      // Otherwise the view has unmounted (e.g. a trailing animation frame):
      // drop the picture instead of deferring it for an id that will never
      // register again, which would retain it forever.
    }
  },
  size(nativeId) {
    if (this.views[`${nativeId}`]) {
      return this.views[`${nativeId}`].getSize();
    } else {
      return {
        width: 0,
        height: 0
      };
    }
  },
  requestRedraw(nativeId) {
    var _this$views;
    // The view may already have unmounted (e.g. a trailing animation frame).
    (_this$views = this.views[`${nativeId}`]) === null || _this$views === void 0 || _this$views.redraw();
  },
  makeImageSnapshot(nativeId, rect) {
    const view = this.views[`${nativeId}`];
    if (!view) {
      throw new Error(`Cannot make image snapshot: view with nativeID ${nativeId} is not registered (it may have unmounted)`);
    }
    return view.makeImageSnapshot(rect);
  },
  makeImageSnapshotAsync(nativeId, rect) {
    return new Promise((resolve, reject) => {
      const view = this.views[`${nativeId}`];
      if (!view) {
        reject(new Error(`Cannot make image snapshot: view with nativeID ${nativeId} is not registered (it may have unmounted)`));
        return;
      }
      const result = view.makeImageSnapshot(rect);
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Failed to make image snapshot"));
      }
    });
  }
};

// eslint-disable-next-line import/no-default-export
export default {};
//# sourceMappingURL=NativeSkiaModule.web.js.map