import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/constants/strings.dart';
import '../../../../core/widgets/primary_button.dart';

class AppIntroPage extends StatelessWidget {
  const AppIntroPage({super.key});

  void _start(BuildContext context) {
    Navigator.of(context).pushReplacementNamed(AppRoutes.eligibility);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Dimens.spacing24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: Dimens.spacing32),
                  Container(
                    padding: const EdgeInsets.all(Dimens.spacing16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(
                        Dimens.borderRadius16,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.shield_moon,
                      size: 42,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing24),
                  const Text(
                    'Selamat datang!',
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing12),
                  const Text(
                    AppStrings.welcomeCopy,
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: Dimens.spacing24),
                  Container(
                    padding: const EdgeInsets.all(Dimens.spacing16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(
                        Dimens.borderRadius16,
                      ),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.08),
                      ),
                    ),
                    child: const Text(
                      'Kamu akan kami pandu langkah demi langkah untuk memastikan bantuan diterima oleh orang yang tepat.',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                  const Spacer(),
                  PrimaryButton(
                    label: 'Mulai',
                    onPressed: () => _start(context),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
