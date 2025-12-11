import 'package:flutter/material.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';

class SelfieIntroPage extends StatelessWidget {
  const SelfieIntroPage({super.key});

  void _goCapture(BuildContext context) {
    Navigator.of(context).pushReplacementNamed(AppRoutes.selfieWithKtp);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Sebelum Selfie')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Dimens.spacing16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: Dimens.spacing12),
                  const Text(
                    'Selfie sambil memegang KTP',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing8),
                  const Text(
                    'Foto ini untuk mencocokkan wajah kamu dengan foto di KTP. Tidak perlu menunggu hasil, kamu bisa lanjut setelah foto.',
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
                        _Bullet(text: 'Pegang KTP di samping wajah kamu.'),
                        SizedBox(height: Dimens.spacing8),
                        _Bullet(
                          text:
                              'Pastikan wajah dan KTP terlihat jelas di kamera.',
                        ),
                        SizedBox(height: Dimens.spacing8),
                        _Bullet(text: 'Gunakan cahaya yang cukup terang.'),
                      ],
                    ),
                  ),
                  const Spacer(),
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
