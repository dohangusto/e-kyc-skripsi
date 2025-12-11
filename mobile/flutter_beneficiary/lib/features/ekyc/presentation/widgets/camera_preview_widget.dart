import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';

class CameraPreviewWidget extends StatelessWidget {
  final String? label;
  final Widget? overlay;

  const CameraPreviewWidget({super.key, this.label, this.overlay});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 3 / 4,
      child: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1F2937)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Center(
              child: Text(
                label ?? 'Preview kamera',
                style: const TextStyle(color: Colors.white70),
              ),
            ),
          ),
          if (overlay != null)
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: overlay,
              ),
            ),
        ],
      ),
    );
  }
}
