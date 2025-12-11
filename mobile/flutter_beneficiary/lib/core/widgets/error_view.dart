import 'package:flutter/material.dart';

import '../constants/dimens.dart';
import 'primary_button.dart';

class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorView({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(Dimens.spacing24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: Dimens.spacing16),
            PrimaryButton(label: 'Coba Lagi', onPressed: onRetry),
          ],
        ],
      ),
    );
  }
}
