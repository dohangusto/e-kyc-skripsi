import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';

class KtpIntroPage extends StatelessWidget {
  const KtpIntroPage({super.key});

  void _goCapture(BuildContext context) {
    Navigator.of(context).pushReplacementNamed(AppRoutes.ktpCapture);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Sebelum Foto KTP')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(Dimens.spacing16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: Dimens.spacing12),
                  Center(
                    child: SizedBox(
                      height: 220,
                      child: Image.asset(
                        'assets/flat/capture_ktp.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing12),
                  const Text(
                    'Siapkan KTP kamu',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing8),
                  const Text(
                    'Kami butuh foto KTP untuk memastikan data kamu benar. Pastikan area cukup terang.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: Dimens.spacing16),
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
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Bullet(
                          text:
                              'Letakkan KTP di tempat datar atau pegang dengan stabil.',
                        ),
                        SizedBox(height: Dimens.spacing8),
                        _Bullet(
                          text: 'Hindari bayangan dan pantulan cahaya di KTP.',
                        ),
                        SizedBox(height: Dimens.spacing8),
                        _Bullet(text: 'Pastikan nama dan NIK terlihat jelas.'),
                      ],
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing24),
                  PrimaryButton(
                    label: 'Lanjutkan',
                    onPressed: () => _goCapture(context),
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

class _Bullet extends StatelessWidget {
  final String text;

  const _Bullet({required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 4),
          child: Icon(Icons.check_circle, size: 18, color: AppColors.secondary),
        ),
        const SizedBox(width: Dimens.spacing8),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(color: AppColors.textSecondary),
          ),
        ),
      ],
    );
  }
}
