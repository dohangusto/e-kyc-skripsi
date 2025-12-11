import 'package:flutter/material.dart';

import '../constants/colors.dart';
import '../constants/dimens.dart';
import 'loading_indicator.dart';

class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isSecondary;

  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.isSecondary = false,
  });

  @override
  Widget build(BuildContext context) {
    final backgroundColor = isSecondary
        ? AppColors.secondary
        : AppColors.primary;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(
            vertical: Dimens.spacing16,
            horizontal: Dimens.spacing20,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Dimens.borderRadius16),
          ),
        ),
        onPressed: isLoading ? null : onPressed,
        child: isLoading
            ? const LoadingIndicator(size: 20, strokeWidth: 2)
            : Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
      ),
    );
  }
}
