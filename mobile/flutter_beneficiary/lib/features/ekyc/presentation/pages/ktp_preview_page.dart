import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../../../../core/constants/routes.dart';
import '../bloc/ktp_capture/ktp_capture_bloc.dart';
import '../ekyc_progress_store.dart';
import '../widgets/ekyc_progress_footer.dart';

class KtpPreviewPage extends StatelessWidget {
  final String? photoPath;

  const KtpPreviewPage({super.key, this.photoPath});

  String? _resolvePath(BuildContext context) {
    if (photoPath != null) return photoPath;
    final state = context.read<KtpCaptureBloc>().state;
    return state.photoPath;
  }

  Widget _buildPreviewImage(String? path) {
    if (path != null) {
      final file = File(path);
      if (file.existsSync()) {
        return Image.file(file, fit: BoxFit.cover);
      }
    }

    return Image.asset('assets/flat/capture_ktp.png', fit: BoxFit.cover);
  }

  void _handleExit(BuildContext context) {
    EkycProgressStore.setStatus('ktp', EkycStepStatus.pending);
    Navigator.of(context).maybePop();
  }

  void _handleRetake(BuildContext context) {
    Navigator.of(context).pushReplacementNamed(AppRoutes.ktpCapture);
  }

  void _handleNext(BuildContext context) {
    final path = _resolvePath(context);
    Navigator.of(
      context,
    ).pushReplacementNamed(AppRoutes.ktpOcr, arguments: path);
  }

  @override
  Widget build(BuildContext context) {
    final path = _resolvePath(context);
    return WillPopScope(
      onWillPop: () async {
        EkycProgressStore.setStatus('ktp', EkycStepStatus.pending);
        return true;
      },
      child: Scaffold(
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          title: const Text('Konfirmasi Foto KTP'),
          centerTitle: false,
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => _handleExit(context),
          ),
          actions: const [
            Padding(
              padding: EdgeInsets.only(right: Dimens.spacing12),
              child: Icon(Icons.help_outline),
            ),
          ],
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(
                    Dimens.spacing16,
                    Dimens.spacing12,
                    Dimens.spacing16,
                    Dimens.spacing16,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(
                              Dimens.borderRadius12,
                            ),
                            child: AspectRatio(
                              aspectRatio: 3 / 2,
                              child: _buildPreviewImage(path),
                            ),
                          ),
                          const SizedBox(height: Dimens.spacing20),
                          const Text(
                            'Hasil foto belum jelas?',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                          TextButton(
                            onPressed: () => _handleRetake(context),
                            child: const Text('Foto ulang'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              EkycProgressFooter(
                title: 'Foto KTP',
                currentStep: 1,
                totalSteps: 2,
                enableAction: true,
                onAction: () => _handleNext(context),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
