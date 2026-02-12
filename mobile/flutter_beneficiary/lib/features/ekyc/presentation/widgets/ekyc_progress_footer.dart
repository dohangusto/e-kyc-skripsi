import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/widgets/primary_button.dart';

class EkycProgressFooter extends StatelessWidget {
  final String title;
  final int currentStep;
  final int totalSteps;
  final bool enableAction;
  final VoidCallback? onAction;
  final String actionLabel;
  final String? labelPrefix;

  const EkycProgressFooter({
    super.key,
    required this.title,
    required this.currentStep,
    required this.totalSteps,
    this.enableAction = false,
    this.onAction,
    this.actionLabel = 'Lanjut',
    this.labelPrefix,
  });

  @override
  Widget build(BuildContext context) {
    final safeTotal = totalSteps <= 0 ? 1 : totalSteps;
    final safeStep = currentStep.clamp(1, safeTotal);
    final progress = safeStep / safeTotal;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Dimens.spacing16,
        0,
        Dimens.spacing16,
        Dimens.spacing24,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: Dimens.spacing8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          labelPrefix == null || labelPrefix!.isEmpty
                              ? 'Langkah $safeStep dari $safeTotal'
                              : '${labelPrefix!} langkah $safeStep dari $safeTotal',
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: Dimens.spacing8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 6,
                            backgroundColor: AppColors.textSecondary
                                .withOpacity(0.2),
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: Dimens.spacing16),
                  SizedBox(
                    width: 140,
                    child: PrimaryButton(
                      label: actionLabel,
                      onPressed: enableAction ? onAction : null,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
