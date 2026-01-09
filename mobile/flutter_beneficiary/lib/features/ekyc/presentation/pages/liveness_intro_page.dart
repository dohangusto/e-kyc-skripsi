import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../../../../core/widgets/primary_button.dart';
import '../bloc/liveness/liveness_bloc.dart';
import '../bloc/liveness/liveness_event.dart';

class LivenessIntroPage extends StatelessWidget {
  const LivenessIntroPage({super.key});

  void _startSession(BuildContext context) {
    context.read<LivenessBloc>().add(const LivenessSessionStarted());
    Navigator.of(context).pushReplacementNamed(AppRoutes.livenessGesture);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Cek Gerakan Wajah')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(Dimens.spacing16),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Sekarang, kami akan mengecek gerakan wajah kamu.',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing12),
                  Center(
                    child: SizedBox(
                      height: 220,
                      child: Image.asset(
                        'assets/flat/liveness_detection.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing12),
                  const Text(
                    'Ikuti instruksi sederhana di layar. Tujuannya untuk memastikan kamu benar-benar hadir.',
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        _Bullet(
                          text:
                              'Pastikan wajah terlihat jelas dan tidak backlight.',
                        ),
                        SizedBox(height: Dimens.spacing8),
                        _Bullet(
                          text:
                              'Ikuti gerakan yang diminta: tengok ke kanan, tersenyum, atau kedip.',
                        ),
                        SizedBox(height: Dimens.spacing8),
                        _Bullet(
                          text: 'Proses ini cepat dan tidak menyakitkan.',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Dimens.spacing24),
                  PrimaryButton(
                    label: 'Mulai',
                    onPressed: () => _startSession(context),
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
