import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../bloc/dashboard_state.dart';

class AssistanceCard extends StatelessWidget {
  final AssistanceInfo data;

  const AssistanceCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Dimens.spacing16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Dimens.borderRadius16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            data.title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: Dimens.spacing8),
          Row(
            children: [
              _Tag(label: data.category),
              if (data.group != null) ...[
                const SizedBox(width: Dimens.spacing8),
                _Tag(label: data.group!),
              ],
            ],
          ),
          const SizedBox(height: Dimens.spacing12),
          Text(
            data.description,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: Dimens.spacing12),
          Text(
            'Perkiraan nilai bantuan: ${data.amount}',
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          if (data.deliveryMethod != null) ...[
            const SizedBox(height: Dimens.spacing8),
            Text(
              data.deliveryMethod!,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;

  const _Tag({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Dimens.spacing12,
        vertical: Dimens.spacing8,
      ),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
