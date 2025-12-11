import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../bloc/dashboard_state.dart';

class ProgressTimeline extends StatelessWidget {
  final String title;
  final List<TimelineStep> steps;
  final Color accentColor;

  const ProgressTimeline({
    super.key,
    required this.title,
    required this.steps,
    this.accentColor = AppColors.primary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Dimens.spacing16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(Dimens.borderRadius16),
        border: Border.all(color: accentColor.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: Dimens.spacing12),
          ...steps.asMap().entries.map(
            (entry) => _TimelineRow(
              step: entry.value,
              isLast: entry.key == steps.length - 1,
              accentColor: accentColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final TimelineStep step;
  final bool isLast;
  final Color accentColor;

  const _TimelineRow({
    required this.step,
    required this.isLast,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            _StatusIcon(status: step.status, accentColor: accentColor),
            if (!isLast)
              Container(width: 2, height: 34, color: _lineColor(step.status)),
          ],
        ),
        const SizedBox(width: Dimens.spacing12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: Dimens.spacing4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: Dimens.spacing4),
                Text(
                  step.subtitle,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: Dimens.spacing12),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Color _lineColor(StepStatus status) {
    switch (status) {
      case StepStatus.done:
        return accentColor.withOpacity(0.7);
      case StepStatus.inProgress:
        return AppColors.accentOrange.withOpacity(0.7);
      case StepStatus.pending:
        return AppColors.textSecondary.withOpacity(0.2);
    }
  }
}

class _StatusIcon extends StatelessWidget {
  final StepStatus status;
  final Color accentColor;

  const _StatusIcon({required this.status, required this.accentColor});

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case StepStatus.done:
        return _Circle(
          color: accentColor,
          child: const Icon(Icons.check, size: 16, color: Colors.white),
        );
      case StepStatus.inProgress:
        return _Circle(
          color: AppColors.accentOrange,
          child: const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.white,
            ),
          ),
        );
      case StepStatus.pending:
        return _Circle(
          color: AppColors.textSecondary.withOpacity(0.15),
          child: const Icon(
            Icons.circle_outlined,
            size: 14,
            color: AppColors.textSecondary,
          ),
        );
    }
  }
}

class _Circle extends StatelessWidget {
  final Color color;
  final Widget child;

  const _Circle({required this.color, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Center(child: child),
    );
  }
}
