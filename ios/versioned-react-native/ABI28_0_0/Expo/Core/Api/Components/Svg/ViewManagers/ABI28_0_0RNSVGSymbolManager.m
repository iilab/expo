/**
 * Copyright (c) 2015-present, Horcrux.
 * All rights reserved.
 *
 * This source code is licensed under the MIT-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "ABI28_0_0RNSVGSymbolManager.h"
#import "ABI28_0_0RNSVGRenderable.h"
#import "ABI28_0_0RNSVGSymbol.h"
#import "ABI28_0_0RCTConvert+RNSVG.h"
#import "ABI28_0_0RNSVGVBMOS.h"

@implementation ABI28_0_0RNSVGSymbolManager

ABI28_0_0RCT_EXPORT_MODULE()

- (ABI28_0_0RNSVGRenderable *)node
{
  return [ABI28_0_0RNSVGSymbol new];
}

ABI28_0_0RCT_EXPORT_VIEW_PROPERTY(minX, CGFloat)
ABI28_0_0RCT_EXPORT_VIEW_PROPERTY(minY, CGFloat)
ABI28_0_0RCT_EXPORT_VIEW_PROPERTY(vbWidth, CGFloat)
ABI28_0_0RCT_EXPORT_VIEW_PROPERTY(vbHeight, CGFloat)
ABI28_0_0RCT_EXPORT_VIEW_PROPERTY(align, NSString)
ABI28_0_0RCT_EXPORT_VIEW_PROPERTY(meetOrSlice, ABI28_0_0RNSVGVBMOS)

@end
