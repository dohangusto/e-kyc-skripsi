import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';

class KtpFrameOverlay extends StatelessWidget {
  final double borderWidth;

  const KtpFrameOverlay({super.key, this.borderWidth = 3});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: true,
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.secondary, width: borderWidth),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
