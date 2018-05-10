package expo.core;

import android.content.Context;

import java.util.Collections;
import java.util.List;

import expo.core.interfaces.Module;
import expo.core.interfaces.Package;
import expo.core.interfaces.ViewManager;

public class BasePackage implements Package {
  @Override
  public List<Module> createInternalModules(Context context) {
    return Collections.emptyList();
  }

  @Override
  public List<ExportedModule> createExportedModules(Context context) {
    return Collections.emptyList();
  }

  @Override
  public List<ViewManager> createViewManagers(Context context) {
    return Collections.emptyList();
  }
}