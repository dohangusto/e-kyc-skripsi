import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';

class EKycCompletePage extends StatelessWidget {
  const EKycCompletePage({super.key});

  void _goDashboard(BuildContext context) {
    Navigator.of(
      context,
    ).pushNamedAndRemoveUntil(AppRoutes.dashboard, (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Proses Selesai')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Dimens.spacing16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: Dimens.spacing24),
                  const Text(
                    'Terima kasih, semua langkah sudah selesai!',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing12),
                  const Text(
                    'Foto KTP, selfie, dan gerakan wajah kamu sudah terkirim. Kamu bisa lanjut melihat status bantuan.',
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
                        color: AppColors.primary.withOpacity(0.1),
                      ),
                    ),
                    child: const Text(
                      'Hasil pengecekan wajah akan muncul di dashboard. Kamu bisa tetap melanjutkan aktivitas lainnya.',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                  const Spacer(),
                  PrimaryButton(
                    label: 'Ke Dashboard',
                    onPressed: () => _goDashboard(context),
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
